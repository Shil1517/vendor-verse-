import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { OutboxService } from "../platform/outbox.service";
import { FileStorageProvider } from "./file-storage.provider";
import { FILE_UPLOADED_EVENT, FilesService } from "./files.service";

const user: AuthenticatedUser = { userId: "u1", sessionId: "s1" };
const POLICY: Record<string, unknown> = {
  FILE_MAX_BYTES: 1000,
  FILE_ALLOWED_CONTENT_TYPES: ["application/pdf"],
  FILE_UPLOAD_URL_TTL_SECONDS: 60,
  FILE_DOWNLOAD_URL_TTL_SECONDS: 30,
};
const request = {
  purpose: "verification-evidence",
  originalName: "licence.pdf",
  contentType: "application/pdf",
  sizeBytes: 500,
};
const fileRow = (over: Record<string, unknown> = {}) => ({
  id: "f1",
  purpose: "verification-evidence",
  storage_key: "verification-evidence/u1/abc",
  original_name: "licence.pdf",
  content_type: "application/pdf",
  size_bytes: "500",
  scan_status: "pending",
  uploaded_at: null,
  created_at: new Date("2026-11-06T10:00:00Z"),
  ...over,
});

describe("FilesService", () => {
  let query: jest.Mock;
  let clientQuery: jest.Mock;
  let enqueue: jest.Mock;
  let record: jest.Mock;
  let storage: jest.Mocked<FileStorageProvider>;

  const build = (
    policy: Record<string, unknown> = POLICY,
    provider: FileStorageProvider | null = storage,
  ) =>
    new FilesService(
      {
        query,
        transaction: (operation: (client: unknown) => unknown) =>
          operation({ query: clientQuery }),
      } as unknown as DatabaseService,
      { get: (key: string) => policy[key] } as unknown as ConfigService<
        never,
        true
      >,
      { record } as unknown as AuditService,
      { enqueue } as unknown as OutboxService,
      provider,
    );

  beforeEach(() => {
    query = jest.fn();
    clientQuery = jest.fn();
    enqueue = jest.fn().mockResolvedValue(undefined);
    record = jest.fn().mockResolvedValue(undefined);
    storage = {
      createUploadUrl: jest.fn().mockResolvedValue({
        url: "https://storage.test/up",
        method: "PUT",
        headers: {},
      }),
      createDownloadUrl: jest.fn().mockResolvedValue("https://storage.test/dl"),
      statObject: jest.fn(),
    };
  });

  it.each([
    ["no storage provider", POLICY, null],
    ["no size limit", { ...POLICY, FILE_MAX_BYTES: undefined }, undefined],
    [
      "no accepted types",
      { ...POLICY, FILE_ALLOWED_CONTENT_TYPES: undefined },
      undefined,
    ],
    [
      "no upload lifetime",
      { ...POLICY, FILE_UPLOAD_URL_TTL_SECONDS: undefined },
      undefined,
    ],
    [
      "no download lifetime",
      { ...POLICY, FILE_DOWNLOAD_URL_TTL_SECONDS: undefined },
      undefined,
    ],
  ])("refuses every operation with %s", async (_name, policy, provider) => {
    const service = build(policy, provider === null ? null : storage);

    await expect(service.create(user, request)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.complete(user, "f1")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.downloadUrl(user, "f1")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a type outside the accepted list and an oversized file", async () => {
    const service = build();

    await expect(
      service.create(user, { ...request, contentType: "text/html" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(user, { ...request, sizeBytes: 1001 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it("stores metadata under a server-built key and returns the signed upload", async () => {
    query.mockResolvedValue({ rows: [fileRow()], rowCount: 1 });

    const result = await build().create(user, {
      ...request,
      contentType: "Application/PDF",
    });

    const values = query.mock.calls[0][1];
    expect(values[0]).toBe("u1");
    expect(values[2]).toMatch(/^verification-evidence\/u1\/[0-9a-f-]{36}$/);
    expect(values[4]).toBe("application/pdf");
    expect(storage.createUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: values[2],
        sizeBytes: 500,
        expiresInSeconds: 60,
      }),
    );
    expect(result.upload.url).toBe("https://storage.test/up");
    expect(result.file).toMatchObject({ id: "f1", uploaded: false });
  });

  it("refuses to complete when no upload arrived or the size differs", async () => {
    query.mockResolvedValue({ rows: [fileRow()], rowCount: 1 });
    const service = build();

    storage.statObject.mockResolvedValueOnce(null);
    await expect(service.complete(user, "f1")).rejects.toBeInstanceOf(
      ConflictException,
    );
    storage.statObject.mockResolvedValueOnce({ sizeBytes: 499 });
    await expect(service.complete(user, "f1")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("marks the upload done and queues the scan in one transaction", async () => {
    query.mockResolvedValue({ rows: [fileRow()], rowCount: 1 });
    storage.statObject.mockResolvedValue({ sizeBytes: 500 });
    clientQuery.mockResolvedValue({
      rows: [fileRow({ uploaded_at: new Date("2026-11-06T10:01:00Z") })],
      rowCount: 1,
    });

    const file = await build().complete(user, "f1");

    expect(file.uploaded).toBe(true);
    expect(enqueue).toHaveBeenCalledWith(
      {
        aggregateType: "file",
        aggregateId: "f1",
        eventType: FILE_UPLOADED_EVENT,
      },
      expect.anything(),
    );
  });

  it("does nothing on a repeated complete", async () => {
    query.mockResolvedValue({
      rows: [fileRow({ uploaded_at: new Date() })],
      rowCount: 1,
    });

    await build().complete(user, "f1");

    expect(storage.statObject).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("scopes every lookup to the owner", async () => {
    query.mockResolvedValue({ rows: [], rowCount: 0 });

    await expect(build().get(user, "f9")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(query.mock.calls[0][1]).toEqual(["f9", "u1"]);
  });

  it("only issues a download URL for a clean file, and audits it", async () => {
    const service = build();
    query.mockResolvedValueOnce({
      rows: [fileRow({ scan_status: "pending" })],
      rowCount: 1,
    });
    await expect(service.downloadUrl(user, "f1")).rejects.toBeInstanceOf(
      ConflictException,
    );

    query.mockResolvedValueOnce({
      rows: [fileRow({ scan_status: "infected" })],
      rowCount: 1,
    });
    await expect(service.downloadUrl(user, "f1")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(storage.createDownloadUrl).not.toHaveBeenCalled();

    query.mockResolvedValueOnce({
      rows: [fileRow({ scan_status: "clean" })],
      rowCount: 1,
    });
    expect(await service.downloadUrl(user, "f1")).toEqual({
      url: "https://storage.test/dl",
      expiresInSeconds: 30,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "file.download_url_issued",
        targetId: "f1",
      }),
    );
  });
});
