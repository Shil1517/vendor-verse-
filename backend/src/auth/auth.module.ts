import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AccessTokenGuard } from "./access-token.guard";
import { LocalTestOtpDeliveryProvider } from "./otp-delivery.provider";
import { OTP_DELIVERY_PROVIDER } from "./auth.constants";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          algorithm: "HS256",
          issuer: config.getOrThrow<string>("JWT_ISSUER"),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenGuard,
    LocalTestOtpDeliveryProvider,
    {
      provide: OTP_DELIVERY_PROVIDER,
      useExisting: LocalTestOtpDeliveryProvider,
    },
  ],
  exports: [AccessTokenGuard, JwtModule],
})
export class AuthModule {}
