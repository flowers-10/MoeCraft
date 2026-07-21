import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("MoeCraft API")
    .setDescription("MoeCraft multi-merchant marketplace API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function setupOpenApi(app: INestApplication): void {
  SwaggerModule.setup("api/docs", app, createOpenApiDocument(app), {
    jsonDocumentUrl: "api/openapi.json",
    swaggerOptions: { persistAuthorization: true }
  });
}
