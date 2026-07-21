import "reflect-metadata";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { createOpenApiDocument } from "./openapi";

async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api/v1", { exclude: [
    { path: "health", method: RequestMethod.GET },
    { path: "readiness", method: RequestMethod.GET }
  ] });
  const outputDirectory = resolve(process.cwd(), "openapi");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, "api-v1.json"), `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`, "utf8");
  await app.close();
}

void generate();
