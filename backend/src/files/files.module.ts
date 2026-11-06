import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { AppEnvironmentConfig } from "../config/environment";
import { FileScanHandler } from "./file-scan.handler";
import {
  FILE_SCANNER,
  FILE_STORAGE_PROVIDER,
  LocalTestFileScanner,
  LocalTestFileStorageProvider,
} from "./file-storage.provider";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

/**
 * Providers are chosen by FILE_STORAGE_PROVIDER. Unset means none: the module
 * loads but uploads, downloads and scans are refused. Only the local/test
 * stand-ins exist until the storage and malware-scan providers are chosen.
 */
type Config = ConfigService<AppEnvironmentConfig, true>;
const useLocalTest = (config: Config) =>
  config.get("FILE_STORAGE_PROVIDER", { infer: true }) === "local-test";

@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    FileScanHandler,
    {
      provide: FILE_STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: Config) =>
        useLocalTest(config) ? new LocalTestFileStorageProvider(config) : null,
    },
    {
      provide: FILE_SCANNER,
      inject: [ConfigService],
      useFactory: (config: Config) =>
        useLocalTest(config) ? new LocalTestFileScanner(config) : null,
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
