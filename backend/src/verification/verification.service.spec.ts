import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { VerificationService } from "./verification.service";

const user: AuthenticatedUser = { userId: "owner-1", sessionId: "session-1" };
const reviewer: AuthenticatedUser = {
  userId: "reviewer-1",
  sessionId: "session-2",
};
const result = (rows: unknown[] = [], rowCount = rows.length) => ({
  rows,
  rowCount,
});

function harness() {
  const query = jest.fn();
  const clientQuery = jest.fn();
  const record = jest.fn().mockResolvedValue(undefined);
  const database = {
    query,
    transaction: (operation: (client: unknown) => unknown) =>
      operation({ query: clientQuery }),
  } as unknown as DatabaseService;
  const audit = { record } as unknown as AuditService;
  return { query, clientQuery, record, database, audit };
}

describe("VerificationService", () => {
  it("only registers clean, uploaded, owner-owned evidence", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(
        result([
          {
            id: "document-1",
            vendor_id: "vendor-1",
            document_type: "license",
            file_id: "file-1",
            issued_by: null,
            expires_at: null,
            submitted_at: new Date("2026-11-10T00:00:00Z"),
          },
        ]),
      );

    const document = await new VerificationService(
      h.database,
      h.audit,
    ).addDocument(user, "vendor-1", {
      documentType: "license",
      fileId: "file-1",
    });

    expect(h.clientQuery.mock.calls[1][0]).toContain(
      "scan_status = 'clean'",
    );
    expect(document).toMatchObject({
      vendorId: "vendor-1",
      documentType: "license",
      fileId: "file-1",
    });
    expect(h.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vendor_document.submit" }),
      expect.anything(),
    );

    const invalid = harness();
    invalid.clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result());
    await expect(
      new VerificationService(invalid.database, invalid.audit).addDocument(
        user,
        "vendor-1",
        { documentType: "license", fileId: "file-foreign" },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("submits a verification with evidence and links a resubmission", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result([{ count: 1 }]))
      .mockResolvedValueOnce(result([{ id: "previous", status: "rejected" }]))
      .mockResolvedValueOnce(
        result([
          {
            id: "verification-1",
            vendor_id: "vendor-1",
            category_id: null,
            level: "L2",
            status: "submitted",
            reviewer_user_id: null,
            reason: null,
            resubmission_of_id: "previous",
            submitted_at: new Date("2026-11-10T00:00:00Z"),
            decided_at: null,
            expires_at: null,
            evidence: [],
          },
        ]),
      )
      .mockResolvedValueOnce(result());

    const verification = await new VerificationService(
      h.database,
      h.audit,
    ).submit(user, "vendor-1", {
      level: "L2",
      documentIds: ["document-1"],
    });

    expect(verification.resubmissionOfId).toBe("previous");
    const insertId = h.clientQuery.mock.calls[3][1][0];
    expect(verification.id).toBe("verification-1");
    expect(h.clientQuery.mock.calls[4][1]).toEqual([insertId, "document-1"]);
    expect(h.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "verification.submit" }),
      expect.anything(),
    );
  });

  it("rejects a second active submission and a category not selected by the vendor", async () => {
    const active = harness();
    active.clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(
        result([{ id: "current", status: "in_review" }]),
      );
    await expect(
      new VerificationService(active.database, active.audit).submit(
        user,
        "vendor-1",
        { level: "L1" },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const category = harness();
    category.clientQuery
      .mockResolvedValueOnce(result([{}]))
      .mockResolvedValueOnce(result());
    await expect(
      new VerificationService(category.database, category.audit).submit(
        user,
        "vendor-1",
        { level: "L3", categoryId: "category-1" },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("records audited review decisions and rejects self-review", async () => {
    const h = harness();
    h.clientQuery
      .mockResolvedValueOnce(
        result([
          {
            vendor_id: "vendor-1",
            owner_user_id: "owner-1",
            status: "submitted",
          },
        ]),
      )
      .mockResolvedValueOnce(
        result([
          {
            id: "verification-1",
            vendor_id: "vendor-1",
            category_id: null,
            level: "L1",
            status: "approved",
            reviewer_user_id: "reviewer-1",
            reason: "Evidence checked",
            resubmission_of_id: null,
            submitted_at: new Date("2026-11-10T00:00:00Z"),
            decided_at: new Date("2026-11-10T00:01:00Z"),
            expires_at: null,
            evidence: [],
          },
        ]),
      );
    const approved = await new VerificationService(
      h.database,
      h.audit,
    ).review(reviewer, "verification-1", "approved", "Evidence checked");
    expect(approved.status).toBe("approved");
    expect(h.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "verification.approved",
        reason: "Evidence checked",
      }),
      expect.anything(),
    );

    const selfReview = harness();
    selfReview.clientQuery.mockResolvedValueOnce(
      result([
        {
          vendor_id: "vendor-1",
          owner_user_id: reviewer.userId,
          status: "submitted",
        },
      ]),
    );
    await expect(
      new VerificationService(selfReview.database, selfReview.audit).review(
        reviewer,
        "verification-1",
        "rejected",
        "Reason",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const missing = harness();
    missing.clientQuery.mockResolvedValueOnce(result());
    await expect(
      new VerificationService(missing.database, missing.audit).review(
        reviewer,
        "missing",
        "rejected",
        "Reason",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("paginates the reviewer queue with a stable timestamp/id cursor", async () => {
    const h = harness();
    const first = {
      id: "00000000-0000-4000-8000-000000000001",
      vendor_id: "vendor-1",
      category_id: null,
      level: "L1",
      status: "submitted",
      reviewer_user_id: null,
      reason: null,
      resubmission_of_id: null,
      submitted_at: new Date("2026-11-10T00:00:00Z"),
      decided_at: null,
      expires_at: null,
      evidence: [],
    };
    const second = {
      ...first,
      id: "00000000-0000-4000-8000-000000000002",
      submitted_at: new Date("2026-11-10T00:01:00Z"),
    };
    h.query.mockResolvedValueOnce(result([first, second]));

    const service = new VerificationService(h.database, h.audit);
    const page = await service.listReviewQueue({ limit: 1 });
    expect(page.verifications).toHaveLength(1);
    expect(page.nextCursor).toBeTruthy();

    h.query.mockResolvedValueOnce(result([second]));
    const nextPage = await service.listReviewQueue({
      limit: 1,
      cursor: page.nextCursor ?? undefined,
    });
    expect(nextPage.verifications[0].id).toBe(second.id);
    expect(h.query.mock.calls[1][1][1]).toBe("2026-11-10T00:00:00.000Z");
    expect(h.query.mock.calls[1][1][2]).toBe(first.id);

    await expect(
      service.listReviewQueue({ limit: 1, cursor: "invalid" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
