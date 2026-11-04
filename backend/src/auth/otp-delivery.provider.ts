import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppEnvironmentConfig } from "../config/environment";

export interface OtpDeliveryProvider {
  issue(): Promise<string>;
}

@Injectable()
export class LocalTestOtpDeliveryProvider implements OtpDeliveryProvider {
  constructor(config: ConfigService<AppEnvironmentConfig, true>) {
    if (
      config.get("APP_ENV", { infer: true }) !== "local" &&
      config.get("APP_ENV", { infer: true }) !== "test"
    ) {
      throw new Error("The fixed OTP provider is restricted to local/test");
    }
  }

  async issue(): Promise<string> {
    return "123456";
  }
}
