import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PoolClient, QueryResult, QueryResultRow } from "pg";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { OutboxService } from "../platform/outbox.service";
import {
  ContractVersionDto,
  CreateContractDto,
  CreateMilestoneDto,
  DeclineContractDto,
  MilestoneActionDto,
} from "./dto/contract.dto";

interface Queryable {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}

interface ContractRow extends QueryResultRow {
  id: string;
  accepted_terms_snapshot_id: string | null;
  customer_user_id: string;
  vendor_id: string;
  category_id: string | null;
  proposer_user_id: string;
  current_version: number;
  state: string;
  activated_at: Date | null;
  completed_at: Date | null;
  confirmation_due_at: Date | null;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  scope: Record<string, unknown>;
  schedule: Record<string, unknown>;
  price_schedule: Record<string, unknown>;
  term: Record<string, unknown>;
}

interface AcceptedContractTerms {
  snapshotId: string;
  customerUserId: string;
  vendorId: string;
  categoryId: string;
  approvedTemplateId: string;
  terms: {
    scope?: string | null;
    inclusions?: string[];
    exclusions?: string[];
    timeline?: Record<string, unknown>;
    totalMinor?: number;
    currency?: string;
    terms?: Record<string, unknown>;
  };
}

const CONTRACT_SELECT = `SELECT contract.id, contract.accepted_terms_snapshot_id,
  contract.customer_user_id, contract.vendor_id, contract.category_id,
  contract.proposer_user_id, contract.current_version, contract.state,
  contract.activated_at, contract.completed_at, contract.confirmation_due_at,
  contract.closed_at, contract.created_at, contract.updated_at,
  version.scope, version.schedule, version.price_schedule, version.term
  FROM contracts AS contract
  JOIN contract_versions AS version
    ON version.contract_id = contract.id
   AND version.version_number = contract.current_version`;

const toView = (row: ContractRow) => ({
  id: row.id,
  acceptedTermsSnapshotId: row.accepted_terms_snapshot_id,
  customerUserId: row.customer_user_id,
  vendorId: row.vendor_id,
  categoryId: row.category_id,
  proposerUserId: row.proposer_user_id,
  currentVersion: row.current_version,
  state: row.state,
  activatedAt: row.activated_at,
  completedAt: row.completed_at,
  confirmationDueAt: row.confirmation_due_at,
  closedAt: row.closed_at,
  version: {
    scope: row.scope,
    schedule: row.schedule,
    priceSchedule: row.price_schedule,
    term: row.term,
  },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

@Injectable()
export class ContractsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async create(user: AuthenticatedUser, request: CreateContractDto) {
    const id = await this.database.transaction(async (client) => {
      await this.assertApprovedTemplate(client, request.categoryId);
      const vendor = await this.vendorOwner(client, request.vendorId);
      if (!vendor || vendor === user.userId) {
        throw new BadRequestException("vendorId must identify another user's vendor");
      }
      const contractId = await this.insertContract(client, {
        customerUserId: user.userId,
        vendorId: request.vendorId,
        categoryId: request.categoryId,
        proposerUserId: user.userId,
        acceptedTermsSnapshotId: null,
        version: {
          scope: request.scope,
          schedule: request.schedule ?? {},
          priceSchedule: request.priceSchedule ?? {},
          term: request.term ?? {},
        },
      });
      await this.recordChange(client, user.userId, contractId, "proposed", "proposed");
      return contractId;
    });
    return this.get(user, id);
  }

  async createFromAcceptedTerms(client: PoolClient, accepted: AcceptedContractTerms) {
    if (!accepted.approvedTemplateId.trim()) {
      throw new ConflictException("The category has no approved contract template configured");
    }
    const id = await this.insertContract(client, {
      customerUserId: accepted.customerUserId,
      vendorId: accepted.vendorId,
      categoryId: accepted.categoryId,
      proposerUserId: accepted.customerUserId,
      acceptedTermsSnapshotId: accepted.snapshotId,
      version: {
        scope: {
          scope: accepted.terms.scope ?? null,
          inclusions: accepted.terms.inclusions ?? [],
          exclusions: accepted.terms.exclusions ?? [],
        },
        schedule: accepted.terms.timeline ?? {},
        priceSchedule: {
          totalMinor: accepted.terms.totalMinor,
          currency: accepted.terms.currency,
        },
        term: {
          ...(accepted.terms.terms ?? {}),
          approvedContractTemplateId: accepted.approvedTemplateId,
        },
      },
    });
    await this.recordChange(client, accepted.customerUserId, id, "proposed_from_rfq", "proposed");
    return id;
  }

  async listMine(user: AuthenticatedUser) {
    const result = await this.database.query<ContractRow>(
      `${CONTRACT_SELECT}
       WHERE contract.customer_user_id = $1 OR EXISTS (
         SELECT 1 FROM vendors
         WHERE vendors.id = contract.vendor_id AND vendors.owner_user_id = $1
       )
       ORDER BY contract.created_at DESC, contract.id`,
      [user.userId],
    );
    return { contracts: result.rows.map(toView) };
  }

  async listForVendor(user: AuthenticatedUser, vendorId: string) {
    await this.requireVendorOwner(this.database, vendorId, user.userId);
    const result = await this.database.query<ContractRow>(
      `${CONTRACT_SELECT}
       WHERE contract.vendor_id = $1
         AND EXISTS (SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2)
       ORDER BY contract.created_at DESC, contract.id`,
      [vendorId, user.userId],
    );
    return { contracts: result.rows.map(toView) };
  }

  async get(user: AuthenticatedUser, contractId: string) {
    const result = await this.database.query<ContractRow>(
      `${CONTRACT_SELECT}
       WHERE contract.id = $1 AND (
         contract.customer_user_id = $2 OR EXISTS (
           SELECT 1 FROM vendors
           WHERE vendors.id = contract.vendor_id AND vendors.owner_user_id = $2
         )
       )`,
      [contractId, user.userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such contract");
    const acceptances = await this.database.query(
      `SELECT acceptance.party_role, acceptance.accepting_user_id,
         acceptance.accepted_at
       FROM contract_acceptances AS acceptance
       JOIN contract_versions AS version ON version.id = acceptance.contract_version_id
       WHERE acceptance.contract_id = $1
         AND version.version_number = $2
       ORDER BY acceptance.party_role`,
      [contractId, result.rows[0].current_version],
    );
    const milestones = await this.database.query(
      `SELECT id, sequence_number, title, state, due_at, completed_at,
         confirmation_due_at, closed_at, support_case_id
       FROM milestones WHERE contract_id = $1 ORDER BY sequence_number`,
      [contractId],
    );
    return { ...toView(result.rows[0]), acceptances: acceptances.rows, milestones: milestones.rows };
  }

  async counter(user: AuthenticatedUser, contractId: string, request: ContractVersionDto) {
    return this.database.transaction(async (client) => {
      const contract = await this.lockContract(client, contractId, user.userId);
      if (!["proposed", "negotiating"].includes(contract.state)) {
        throw new ConflictException(`A ${contract.state} contract cannot be countered`);
      }
      const next = contract.current_version + 1;
      await client.query(
        `INSERT INTO contract_versions
           (contract_id, version_number, proposed_by_user_id, scope, schedule,
            price_schedule, term)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb)`,
        [
          contractId,
          next,
          user.userId,
          JSON.stringify(request.scope),
          JSON.stringify(request.schedule ?? {}),
          JSON.stringify(request.priceSchedule ?? {}),
          JSON.stringify(request.term ?? {}),
        ],
      );
      await client.query(
        `UPDATE contracts SET current_version = $2, state = 'negotiating' WHERE id = $1`,
        [contractId, next],
      );
      await this.recordChange(client, user.userId, contractId, "countered", "negotiating");
      return this.getWithin(client, user.userId, contractId);
    });
  }

  async accept(user: AuthenticatedUser, contractId: string) {
    return this.database.transaction(async (client) => {
      const contract = await this.lockContract(client, contractId, user.userId);
      if (!["proposed", "negotiating"].includes(contract.state)) {
        throw new ConflictException(`A ${contract.state} contract cannot be accepted`);
      }
      const partyRole = contract.party === "customer" ? "customer" : "vendor";
      const inserted = await client.query(
        `INSERT INTO contract_acceptances
           (contract_id, contract_version_id, party_role, accepting_user_id)
         SELECT $1, version.id, $3, $4
         FROM contract_versions AS version
         WHERE version.contract_id = $1 AND version.version_number = $2
         ON CONFLICT (contract_version_id, party_role) DO NOTHING
         RETURNING id`,
        [contractId, contract.current_version, partyRole, user.userId],
      );
      if (inserted.rowCount !== 1) {
        throw new ConflictException("This party already accepted the current contract version");
      }
      const accepted = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM contract_acceptances AS acceptance
         JOIN contract_versions AS version ON version.id = acceptance.contract_version_id
         WHERE acceptance.contract_id = $1 AND version.version_number = $2`,
        [contractId, contract.current_version],
      );
      const active = Number(accepted.rows[0].count) === 2;
      if (active) {
        await client.query(
          `UPDATE contracts SET state = 'active',
             activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP)
           WHERE id = $1`,
          [contractId],
        );
      }
      await this.recordChange(client, user.userId, contractId, "accepted", active ? "active" : contract.state);
      return this.getWithin(client, user.userId, contractId);
    });
  }

  async decline(user: AuthenticatedUser, contractId: string, request: DeclineContractDto) {
    return this.database.transaction(async (client) => {
      const contract = await this.lockContract(client, contractId, user.userId);
      if (!["proposed", "negotiating"].includes(contract.state)) {
        throw new ConflictException(`A ${contract.state} contract cannot be declined`);
      }
      await client.query(`UPDATE contracts SET state = 'declined' WHERE id = $1`, [contractId]);
      await this.recordChange(client, user.userId, contractId, "declined", "declined", request.reason);
      return { id: contractId, state: "declined" };
    });
  }

  async createMilestone(
    user: AuthenticatedUser,
    contractId: string,
    request: CreateMilestoneDto,
  ) {
    return this.database.transaction(async (client) => {
      const contract = await this.lockContract(client, contractId, user.userId);
      if (contract.state !== "active") throw new ConflictException("Milestones require an active contract");
      if ((request.amountMinor === undefined) !== (request.currency === undefined)) {
        throw new BadRequestException("amountMinor and currency must be supplied together");
      }
      if (request.amountMinor !== undefined &&
          (!Number.isSafeInteger(request.amountMinor) || request.amountMinor < 0)) {
        throw new BadRequestException("amountMinor must be a non-negative safe integer");
      }
      if (request.currency !== undefined && !/^[A-Z]{3}$/.test(request.currency)) {
        throw new BadRequestException("currency must be an uppercase ISO currency code");
      }
      const dueAt = request.dueAt ? new Date(request.dueAt) : null;
      if (dueAt && !Number.isFinite(dueAt.getTime())) {
        throw new BadRequestException("dueAt must be a valid date");
      }
      const sequence = await client.query<{ next: number }>(
        `SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next
         FROM milestones WHERE contract_id = $1`,
        [contractId],
      );
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO milestones
           (contract_id, sequence_number, title, terms, amount_minor, currency, due_at)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7) RETURNING id`,
        [
          contractId,
          sequence.rows[0].next,
          request.title,
          JSON.stringify(request.terms ?? {}),
          request.amountMinor ?? null,
          request.currency ?? null,
          dueAt,
        ],
      );
      await this.recordChange(client, user.userId, contractId, "milestone_created", contract.state);
      return { id: inserted.rows[0].id, contractId, sequenceNumber: sequence.rows[0].next, state: "pending" };
    });
  }

  async milestoneAction(
    user: AuthenticatedUser,
    milestoneId: string,
    request: MilestoneActionDto,
  ) {
    return this.database.transaction(async (client) => {
      const result = await client.query<{
        id: string;
        contract_id: string;
        state: string;
        customer_user_id: string;
        vendor_id: string;
        support_case_id: string | null;
        party: "customer" | "vendor";
      }>(
        `SELECT milestone.id, milestone.contract_id, milestone.state,
           milestone.support_case_id,
           contract.customer_user_id, contract.vendor_id,
           CASE WHEN contract.customer_user_id = $2 THEN 'customer' ELSE 'vendor' END AS party
         FROM milestones AS milestone
         JOIN contracts AS contract ON contract.id = milestone.contract_id
         WHERE milestone.id = $1 AND (
           contract.customer_user_id = $2 OR EXISTS (
             SELECT 1 FROM vendors WHERE vendors.id = contract.vendor_id AND owner_user_id = $2
           )
         )
         FOR UPDATE OF milestone, contract`,
        [milestoneId, user.userId],
      );
      const milestone = result.rows[0];
      if (!milestone) throw new NotFoundException("No such milestone");
      const vendorAction = request.action === "start" || request.action === "complete";
      if (
        (vendorAction && milestone.party !== "vendor") ||
        (!vendorAction && request.action !== "resolve" && milestone.party !== "customer")
      ) {
        throw new NotFoundException("No such milestone for this user");
      }
      const transitions = {
        start: ["pending", "in_progress"],
        complete: ["in_progress", "completed_awaiting"],
        confirm: ["completed_awaiting", "closed"],
        dispute: ["completed_awaiting", "disputed"],
        resolve: ["disputed", "closed"],
      } as const;
      const [from, to] = transitions[request.action];
      if (milestone.state !== from) throw new ConflictException(`A ${milestone.state} milestone cannot ${request.action}`);
      if (request.action === "dispute") {
        if (!request.supportCaseId) throw new BadRequestException("supportCaseId is required");
        const caseRow = await client.query(
          `SELECT 1 FROM support_cases
           WHERE id = $1 AND transaction_type = 'contract_milestone'
             AND transaction_id = $2`,
          [request.supportCaseId, milestoneId],
        );
        if (caseRow.rowCount !== 1) {
          throw new BadRequestException("supportCaseId is not linked to this milestone");
        }
      }
      if (request.action === "resolve") {
        if (!milestone.support_case_id) {
          throw new ConflictException("This milestone has no linked support case");
        }
        const caseRow = await client.query(
          `SELECT 1 FROM support_cases
           WHERE id = $1 AND transaction_type = 'contract_milestone'
             AND transaction_id = $2 AND resolved_at IS NOT NULL`,
          [milestone.support_case_id, milestoneId],
        );
        if (caseRow.rowCount !== 1) {
          throw new ConflictException("The linked support case is not resolved");
        }
      }
      if (request.action === "start") {
        await client.query(`UPDATE milestones SET state = $2 WHERE id = $1`, [milestoneId, to]);
      } else if (request.action === "complete") {
        await client.query(
          `UPDATE milestones SET state = $2, completed_at = CURRENT_TIMESTAMP,
             confirmation_due_at = CURRENT_TIMESTAMP + INTERVAL '7 days'
           WHERE id = $1`,
          [milestoneId, to],
        );
      } else if (request.action === "confirm" || request.action === "resolve") {
        await client.query(
          `UPDATE milestones SET state = $2, closed_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [milestoneId, to],
        );
        await this.completeContractIfReady(client, milestone.contract_id);
      } else {
        await client.query(
          `UPDATE milestones SET state = $2, support_case_id = $3 WHERE id = $1`,
          [milestoneId, to, request.supportCaseId],
        );
      }
      await this.recordChange(
        client,
        user.userId,
        milestone.contract_id,
        `milestone_${request.action}`,
        to,
      );
      return { id: milestoneId, contractId: milestone.contract_id, state: to };
    });
  }

  async closeOverdueMilestones() {
    return this.database.transaction(async (client) => {
      const result = await client.query<{ id: string; contract_id: string }>(
        `UPDATE milestones SET state = 'closed', closed_at = CURRENT_TIMESTAMP
         WHERE state = 'completed_awaiting'
           AND confirmation_due_at <= CURRENT_TIMESTAMP
         RETURNING id, contract_id`,
      );
      const contractIds = [...new Set(result.rows.map((row) => row.contract_id))];
      for (const row of result.rows) {
        await this.audit.record({
          actorService: "contract-scheduler",
          action: "contract.milestone_auto_closed",
          targetType: "milestone",
          targetId: row.id,
        }, client);
        await this.outbox.enqueue(
          { aggregateType: "contract", aggregateId: row.contract_id, eventType: "contract.milestone_auto_closed", payload: { milestoneId: row.id } },
          client,
        );
      }
      for (const contractId of contractIds) {
        await this.completeContractIfReady(client, contractId);
      }
      return result.rowCount ?? 0;
    });
  }

  async complete(user: AuthenticatedUser, contractId: string) {
    return this.database.transaction(async (client) => {
      const contract = await this.lockContract(client, contractId, user.userId);
      if (contract.state !== "active") throw new ConflictException("Only an active contract can complete");
      const open = await client.query(
        `SELECT 1 FROM milestones WHERE contract_id = $1 AND state <> 'closed' LIMIT 1`,
        [contractId],
      );
      if (open.rowCount) throw new ConflictException("Every milestone must be closed before contract completion");
      await client.query(
        `UPDATE contracts SET state = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [contractId],
      );
      await this.recordChange(client, user.userId, contractId, "completed", "completed");
      return { id: contractId, state: "completed" };
    });
  }

  private async insertContract(
    client: Queryable,
    contract: {
      customerUserId: string;
      vendorId: string;
      categoryId: string;
      proposerUserId: string;
      acceptedTermsSnapshotId: string | null;
      version: {
        scope: Record<string, unknown>;
        schedule: Record<string, unknown>;
        priceSchedule: Record<string, unknown>;
        term: Record<string, unknown>;
      };
    },
  ) {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO contracts
         (accepted_terms_snapshot_id, customer_user_id, vendor_id, category_id, proposer_user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        contract.acceptedTermsSnapshotId,
        contract.customerUserId,
        contract.vendorId,
        contract.categoryId,
        contract.proposerUserId,
      ],
    );
    const id = inserted.rows[0].id;
    await client.query(
      `INSERT INTO contract_versions
         (contract_id, version_number, proposed_by_user_id, scope, schedule,
          price_schedule, term)
       VALUES ($1, 1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb)`,
      [
        id,
        contract.proposerUserId,
        JSON.stringify(contract.version.scope),
        JSON.stringify(contract.version.schedule),
        JSON.stringify(contract.version.priceSchedule),
        JSON.stringify(contract.version.term),
      ],
    );
    return id;
  }

  private async assertApprovedTemplate(client: Queryable, categoryId: string) {
    const result = await client.query<{
      lifecycle: string;
      configuration: Record<string, unknown>;
    }>(
      `SELECT category.lifecycle, config.configuration
       FROM categories AS category
       JOIN category_config_versions AS config
         ON config.category_id = category.id
        AND config.version_number = category.current_version
       WHERE category.id = $1`,
      [categoryId],
    );
    const templateId = result.rows[0]?.configuration.approvedContractTemplateId;
    if (
      result.rows[0]?.lifecycle !== "ACTIVE" ||
      typeof templateId !== "string" ||
      !templateId.trim()
    ) {
      throw new ConflictException("Contracts are not enabled for this category until an approved template is configured");
    }
  }

  private async lockContract(client: Queryable, contractId: string, userId: string) {
    const result = await client.query<ContractRow & { party: "customer" | "vendor" }>(
      `SELECT contract.*, CASE
         WHEN contract.customer_user_id = $2 THEN 'customer' ELSE 'vendor'
       END AS party
       FROM contracts AS contract
       WHERE contract.id = $1 AND (
         contract.customer_user_id = $2 OR EXISTS (
           SELECT 1 FROM vendors WHERE vendors.id = contract.vendor_id AND owner_user_id = $2
         )
       ) FOR UPDATE`,
      [contractId, userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such contract");
    return result.rows[0];
  }

  private async getWithin(client: Queryable, userId: string, contractId: string) {
    const result = await client.query<ContractRow>(
      `${CONTRACT_SELECT}
       WHERE contract.id = $1 AND (
         contract.customer_user_id = $2 OR EXISTS (
           SELECT 1 FROM vendors
           WHERE vendors.id = contract.vendor_id AND vendors.owner_user_id = $2
         )
       )`,
      [contractId, userId],
    );
    if (!result.rows[0]) throw new NotFoundException("No such contract");
    return toView(result.rows[0]);
  }

  private async vendorOwner(client: Queryable, vendorId: string) {
    const result = await client.query<{ owner_user_id: string }>(
      `SELECT owner_user_id FROM vendors WHERE id = $1`,
      [vendorId],
    );
    return result.rows[0]?.owner_user_id;
  }

  private async requireVendorOwner(client: Queryable, vendorId: string, userId: string) {
    const result = await client.query(
      `SELECT 1 FROM vendors WHERE id = $1 AND owner_user_id = $2`,
      [vendorId, userId],
    );
    if (result.rowCount !== 1) throw new NotFoundException("No such vendor for this user");
  }

  private async completeContractIfReady(client: PoolClient, contractId: string) {
    const result = await client.query(
      `UPDATE contracts SET state = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND state = 'active'
         AND EXISTS (SELECT 1 FROM milestones WHERE contract_id = $1)
         AND NOT EXISTS (
           SELECT 1 FROM milestones WHERE contract_id = $1 AND state <> 'closed'
         )`,
      [contractId],
    );
    if (result.rowCount === 1) {
      await this.outbox.enqueue(
        { aggregateType: "contract", aggregateId: contractId, eventType: "contract.completed" },
        client,
      );
    }
  }

  private async recordChange(
    client: PoolClient,
    userId: string,
    contractId: string,
    action: string,
    state: string,
    reason?: string,
  ) {
    await this.audit.record(
      {
        actorUserId: userId,
        action: `contract.${action}`,
        targetType: "contract",
        targetId: contractId,
        reason,
        metadata: { state },
      },
      client,
    );
    await this.outbox.enqueue(
      { aggregateType: "contract", aggregateId: contractId, eventType: `contract.${action}` },
      client,
    );
  }
}
