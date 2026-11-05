import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { ProblemDetailsFilter } from "./common/problem-details.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("correlation-id", randomUUID());
    next();
  });
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
    allowedHeaders: ["authorization", "content-type"],
    exposedHeaders: ["correlation-id"],
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
