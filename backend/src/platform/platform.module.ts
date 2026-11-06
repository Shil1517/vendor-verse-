import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditService } from "./audit.service";
import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { OutboxDispatcherService } from "./outbox-dispatcher.service";
import { OutboxService } from "./outbox.service";
import { RateLimitService } from "./rate-limit.service";

@Global()
@Module({
  providers: [
    AuditService,
    OutboxService,
    OutboxDispatcherService,
    RateLimitService,
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
  exports: [
    AuditService,
    OutboxService,
    OutboxDispatcherService,
    RateLimitService,
  ],
})
export class PlatformModule {}
