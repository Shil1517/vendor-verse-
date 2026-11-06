import { Inject, Injectable, OnModuleInit, Optional } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import {
  OutboxDispatcherService,
  OutboxHandler,
  OutboxRecord,
} from "../platform/outbox-dispatcher.service";
import { FILE_SCANNER, FileScanner } from "./file-storage.provider";
import { FILE_UPLOADED_EVENT } from "./files.service";

/**
 * Scans a file after its upload is confirmed and records the verdict. With no
 * scanner configured the event fails and is retried, so the file stays pending
 * and unusable rather than being treated as clean.
 */
@Injectable()
export class FileScanHandler implements OutboxHandler, OnModuleInit {
  readonly eventType = FILE_UPLOADED_EVENT;

  constructor(
    private readonly database: DatabaseService,
    private readonly dispatcher: OutboxDispatcherService,
    @Optional()
    @Inject(FILE_SCANNER)
    private readonly scanner: FileScanner | null = null,
  ) {}

  onModuleInit(): void {
    this.dispatcher.register(this);
  }

  async handle(event: OutboxRecord): Promise<void> {
    if (!this.scanner) throw new Error("No file scanner is configured");
    const file = await this.database.query<{ storage_key: string }>(
      `SELECT storage_key FROM files
       WHERE id = $1 AND scan_status = 'pending' AND uploaded_at IS NOT NULL`,
      [event.aggregateId],
    );
    if (file.rowCount !== 1) return; // already scanned, or gone

    const verdict = await this.scanner.scan(file.rows[0].storage_key);
    await this.database.query(
      `UPDATE files SET scan_status = $2, scanned_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND scan_status = 'pending'`,
      [event.aggregateId, verdict],
    );
  }
}
