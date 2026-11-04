import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { ModeSwitchDto } from "./dto/mode-switch.dto";

type AccountMode = "CUSTOMER" | "VENDOR" | "BUSINESS";

interface AccountRow {
  id: string;
  current_mode: "customer" | "vendor" | "business";
  has_vendor: boolean;
}

@Injectable()
export class AccountsService {
  constructor(private readonly database: DatabaseService) {}

  async getCurrentContext(user: AuthenticatedUser): Promise<{
    userId: string;
    currentMode: AccountMode;
    availableModes: AccountMode[];
  }> {
    const account = await this.loadAccount(user.userId);
    const availableModes = this.availableModes(account);
    const currentMode = this.toApiMode(account.current_mode);
    if (!availableModes.includes(currentMode)) {
      throw new ServiceUnavailableException(
        "Current account mode has no eligible account record",
      );
    }
    return { userId: account.id, currentMode, availableModes };
  }

  async switchMode(
    user: AuthenticatedUser,
    request: ModeSwitchDto,
  ): Promise<{
    userId: string;
    currentMode: AccountMode;
    availableModes: AccountMode[];
  }> {
    if (request.mode === "BUSINESS") {
      throw new ConflictException(
        "Business mode is unavailable until business-account verification is implemented",
      );
    }
    const result = await this.database.query<AccountRow>(
      `UPDATE users AS account
       SET current_mode = LOWER($2),
           updated_at = CURRENT_TIMESTAMP
       WHERE account.id = $1
         AND (
           $2 = 'CUSTOMER'
           OR EXISTS (
             SELECT 1 FROM vendors
             WHERE vendors.owner_user_id = account.id
           )
         )
       RETURNING account.id, account.current_mode,
         EXISTS (
           SELECT 1 FROM vendors
           WHERE vendors.owner_user_id = account.id
         ) AS has_vendor`,
      [user.userId, request.mode],
    );
    const account = result.rows[0];
    if (!account) {
      throw new ConflictException("Requested mode is not available");
    }
    return {
      userId: account.id,
      currentMode: this.toApiMode(account.current_mode),
      availableModes: this.availableModes(account),
    };
  }

  private async loadAccount(userId: string): Promise<AccountRow> {
    const result = await this.database.query<AccountRow>(
      `SELECT account.id, account.current_mode,
         EXISTS (
           SELECT 1 FROM vendors
           WHERE vendors.owner_user_id = account.id
         ) AS has_vendor
       FROM users AS account
       WHERE account.id = $1`,
      [userId],
    );
    const account = result.rows[0];
    if (!account) {
      throw new ServiceUnavailableException(
        "Authenticated account is missing from persistence",
      );
    }
    return account;
  }

  private availableModes(account: AccountRow): AccountMode[] {
    return account.has_vendor ? ["CUSTOMER", "VENDOR"] : ["CUSTOMER"];
  }

  private toApiMode(mode: AccountRow["current_mode"]): AccountMode {
    switch (mode) {
      case "customer":
        return "CUSTOMER";
      case "vendor":
        return "VENDOR";
      case "business":
        return "BUSINESS";
    }
  }
}
