import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AppEnvironmentConfig } from "../config/environment";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../platform/audit.service";
import { OutboxService } from "../platform/outbox.service";
import { CreateFileDto } from "./dto/files.dto";
import {
  FILE_STORAGE_PROVIDER,
  FileStorageProvider,
  SignedUpload,
} from "./file-storage.provider";

export const FILE_UPLOADED_EVENT = "file.uploaded";

export interface FileView {
  id: string;
  purpose: string;
  originalName: string | null;
  contentType: string;
  sizeBytes: number;
  scanStatus: "pending" | "clean" | "infected" | "failed";
  uploaded: boolean;
  createdAt: string;
}

interface FileRow {
  id: string;
  purpose: string;
  storage_key: string;
  original_name: string | null;
  content_type: string;
  size_bytes: string;
  scan_status: FileView["scanStatus"];
  uploaded_at: Date | null;
  created_at: Date;
}

const FILE_COLUMNS = `id, purpose, storage_key, original_name, content_type,
  size_bytes, scan_status, uploaded_at, created_at`;

/**
 * Private files (PRS section 16). Bytes go straight to storage through a
 * short-lived signed URL; this service holds metadata only. A file is usable
 * (downloadable, attachable as evidence) only once its scan is clean.
 *
 * Size limit, accepted types and URL lifetimes are owner decisions that are
 * not made. While any is unset, or no storage provider is configured, every
 * operation here is refused rather than guessing.
 */
@Injectable()
export class FilesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<AppEnvironmentConfig, true>,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Optional()
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storage: FileStorageProvider | null = null,
  ) {}

  private policy() {
    const maxBytes = this.config.get("FILE_MAX_BYTES", { infer: true });
    const types = this.config.get("FILE_ALLOWED_CONTENT_TYPES", {
      infer: true,
    });
    const uploadTtl = this.config.get("FILE_UPLOAD_URL_TTL_SECONDS", {
      infer: true,
    });
    const downloadTtl = this.config.get("FILE_DOWNLOAD_URL_TTL_SECONDS", {
      infer: true,
    });
    if (
      !this.storage ||
      maxBytes === undefined ||
      !types ||
      uploadTtl === undefined ||
      downloadTtl === undefined
    ) {
      throw new ServiceUnavailableException(
        "File storage is not configured: provider, size limit, accepted types and URL lifetimes are still open decisions",
      );
    }
    return { storage: this.storage, maxBytes, types, uploadTtl, downloadTtl };
  }

  async create(
    user: AuthenticatedUser,
    request: CreateFileDto,
  ): Promise<{ file: FileView; upload: SignedUpload }> {
    const policy = this.policy();
    const contentType = request.contentType.toLowerCase();
    if (!policy.types.includes(contentType)) {
      throw new BadRequestException("That file type is not accepted");
    }
    if (request.sizeBytes > policy.maxBytes) {
      throw new BadRequestException("That file is larger than the limit");
    }
    // The key never comes from the client, so a name cannot steer where bytes land.
    const storageKey = `${request.purpose}/${user.userId}/${randomUUID()}`;
    const inserted = await this.database.query<FileRow>(
      `INSERT INTO files
         (owner_user_id, purpose, storage_key, original_name, content_type,
          size_bytes, checksum_sha256)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${FILE_COLUMNS}`,
      [
        user.userId,
        request.purpose,
        storageKey,
        request.originalName ?? null,
        contentType,
        request.sizeBytes,
        request.checksumSha256?.toLowerCase() ?? null,
      ],
    );
    const row = inserted.rows[0];
    const upload = await policy.storage.createUploadUrl({
      storageKey,
      contentType,
      sizeBytes: request.sizeBytes,
      expiresInSeconds: policy.uploadTtl,
    });
    return { file: toView(row), upload };
  }

  /** The client says the upload finished: verify it, then queue the scan. */
  async complete(user: AuthenticatedUser, fileId: string): Promise<FileView> {
    const policy = this.policy();
    const row = await this.ownRow(user, fileId);
    if (row.uploaded_at) return toView(row);

    const stored = await policy.storage.statObject(row.storage_key);
    if (!stored) {
      throw new ConflictException("No upload was received for this file");
    }
    if (stored.sizeBytes !== Number(row.size_bytes)) {
      throw new ConflictException("The uploaded size does not match");
    }
    const updated = await this.database.transaction(async (client) => {
      const result = await client.query<FileRow>(
        `UPDATE files SET uploaded_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND owner_user_id = $2 AND uploaded_at IS NULL
         RETURNING ${FILE_COLUMNS}`,
        [fileId, user.userId],
      );
      if (result.rowCount !== 1) return null;
      await this.outbox.enqueue(
        {
          aggregateType: "file",
          aggregateId: fileId,
          eventType: FILE_UPLOADED_EVENT,
        },
        client,
      );
      return result.rows[0];
    });
    return toView(updated ?? (await this.ownRow(user, fileId)));
  }

  async get(user: AuthenticatedUser, fileId: string): Promise<FileView> {
    return toView(await this.ownRow(user, fileId));
  }

  async downloadUrl(
    user: AuthenticatedUser,
    fileId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const policy = this.policy();
    const row = await this.ownRow(user, fileId);
    if (row.scan_status !== "clean") {
      throw new ConflictException("The file has not passed its scan");
    }
    const url = await policy.storage.createDownloadUrl({
      storageKey: row.storage_key,
      expiresInSeconds: policy.downloadTtl,
    });
    await this.audit.record({
      actorUserId: user.userId,
      action: "file.download_url_issued",
      targetType: "file",
      targetId: fileId,
    });
    return { url, expiresInSeconds: policy.downloadTtl };
  }

  async reviewEvidenceDownloadUrl(
    reviewer: AuthenticatedUser,
    verificationId: string,
    fileId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const policy = this.policy();
    const result = await this.database.query<FileRow>(
      `SELECT file.id, file.purpose, file.storage_key, file.original_name,
              file.content_type, file.size_bytes, file.scan_status,
              file.uploaded_at, file.created_at
       FROM files AS file
       JOIN vendor_documents AS document ON document.file_id = file.id
       JOIN verification_evidence AS evidence
         ON evidence.document_id = document.id
       WHERE evidence.verification_id = $1 AND file.id = $2
         AND file.uploaded_at IS NOT NULL AND file.scan_status = 'clean'`,
      [verificationId, fileId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("No clean evidence file for this verification");
    }
    const url = await policy.storage.createDownloadUrl({
      storageKey: row.storage_key,
      expiresInSeconds: policy.downloadTtl,
    });
    await this.audit.record({
      actorUserId: reviewer.userId,
      action: "verification.evidence.download",
      targetType: "file",
      targetId: fileId,
      metadata: { verificationId },
    });
    return { url, expiresInSeconds: policy.downloadTtl };
  }

  private async ownRow(
    user: AuthenticatedUser,
    fileId: string,
  ): Promise<FileRow> {
    const result = await this.database.query<FileRow>(
      `SELECT ${FILE_COLUMNS} FROM files
       WHERE id = $1 AND owner_user_id = $2`,
      [fileId, user.userId],
    );
    if (result.rowCount !== 1) throw new NotFoundException("File not found");
    return result.rows[0];
  }
}

function toView(row: FileRow): FileView {
  return {
    id: row.id,
    purpose: row.purpose,
    originalName: row.original_name,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes),
    scanStatus: row.scan_status,
    uploaded: row.uploaded_at !== null,
    createdAt: row.created_at.toISOString(),
  };
}
