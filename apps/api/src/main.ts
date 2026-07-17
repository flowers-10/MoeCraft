import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import type { AppEnvironment } from "./config/environment";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<AppEnvironment, true>);
  const port = config.get("PORT", { infer: true });
  const corsOrigins = config.get("CORS_ORIGINS", { infer: true });

  app.enableCors({
    credentials: true,
    origin: corsOrigins
  });

  await app.listen(port);
  console.log(`MoeCraft API running at http://localhost:${port}`);
}

void bootstrap();
