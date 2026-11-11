import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FilesModule } from "../files/files.module";
import { RbacModule } from "../rbac/rbac.module";
import {
  AdminVerificationController,
  VendorVerificationController,
} from "./verification.controller";
import { VerificationService } from "./verification.service";

@Module({
  imports: [AuthModule, FilesModule, RbacModule],
  controllers: [VendorVerificationController, AdminVerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
