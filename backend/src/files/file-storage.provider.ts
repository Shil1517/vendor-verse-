import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppEnvironmentConfig } from "../config/environment";

export interface SignedUpload {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

/**
 * Private S3-compatible object storage (docs/06). The real provider is not
 * chosen yet; nothing here reads or serves bytes through the API.
 */
export interface FileStorageProvider {
  /** Short-lived URL the client uploads the bytes to. */
  createUploadUrl(input: {
    storageKey: string;
    contentType: string;
    sizeBytes: number;
    expiresInSeconds: number;
  }): Promise<SignedUpload>;
  /** Short-lived URL the authorised caller downloads from. */
  createDownloadUrl(input: {
    storageKey: string;
    expiresInSeconds: number;
  }): Promise<string>;
  /** Size of the stored object, or null when nothing was uploaded. */
  statObject(storageKey: string): Promise<{ sizeBytes: number } | null>;
}

export const FILE_STORAGE_PROVIDER = Symbol("FILE_STORAGE_PROVIDER");

export type ScanVerdict = "clean" | "infected" | "failed";

/** Malware scan of an uploaded object (PRS section 16). */
export interface FileScanner {
  scan(storageKey: string): Promise<ScanVerdict>;
}

export const FILE_SCANNER = Symbol("FILE_SCANNER");

function requireLocal(config: ConfigService<AppEnvironmentConfig, true>) {
  const env = config.get("APP_ENV", { infer: true });
  if (env !== "local" && env !== "test") {
    throw new Error(
      "The local-test file adapters are restricted to local/test",
    );
  }
}

/**
 * Local/test stand-in: stores no bytes and every object "exists" at the size
 * the caller declared. It exists so the flow can run end to end before a
 * storage provider is chosen; it must not be used for real files.
 */
@Injectable()
export class LocalTestFileStorageProvider implements FileStorageProvider {
  private readonly declared = new Map<string, number>();

  constructor(config: ConfigService<AppEnvironmentConfig, true>) {
    requireLocal(config);
  }

  async createUploadUrl(input: {
    storageKey: string;
    contentType: string;
    sizeBytes: number;
    expiresInSeconds: number;
  }): Promise<SignedUpload> {
    this.declared.set(input.storageKey, input.sizeBytes);
    return {
      url: `local-test://upload/${input.storageKey}?expires=${input.expiresInSeconds}`,
      method: "PUT",
      headers: { "content-type": input.contentType },
    };
  }

  async createDownloadUrl(input: {
    storageKey: string;
    expiresInSeconds: number;
  }): Promise<string> {
    return `local-test://download/${input.storageKey}?expires=${input.expiresInSeconds}`;
  }

  async statObject(storageKey: string): Promise<{ sizeBytes: number } | null> {
    const sizeBytes = this.declared.get(storageKey);
    return sizeBytes === undefined ? null : { sizeBytes };
  }
}

/** Local/test scanner: reports every object clean. Not a malware scan. */
@Injectable()
export class LocalTestFileScanner implements FileScanner {
  constructor(config: ConfigService<AppEnvironmentConfig, true>) {
    requireLocal(config);
  }

  async scan(): Promise<ScanVerdict> {
    return "clean";
  }
}
