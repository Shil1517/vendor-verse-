import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ProblemDetailsFilter } from "./common/problem-details.filter";
import { correlationMiddleware } from "./platform/request-context";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(correlationMiddleware);
  app.setGlobalPrefix("v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  app.enableCors({
    origin: config.getOrThrow<string[]>("CORS_ORIGINS"),
    allowedHeaders: ["authorization", "content-type", "idempotency-key"],
    exposedHeaders: ["correlation-id", "idempotent-replayed"],
  });
  const swaggerConfig = new DocumentBuilder()
    .setTitle("VendorVerse API")
    .setDescription(
      "Local/test API for VendorVerse authentication and accounts.",
    )
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument);
  await app.listen(
    config.getOrThrow<number>("PORT"),
    config.getOrThrow<string>("HOST"),
  );
}

void bootstrap();
