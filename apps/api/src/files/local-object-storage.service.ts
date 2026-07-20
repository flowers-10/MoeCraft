import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

@Injectable()
export class LocalObjectStorageService {
  private readonly root = path.join(this.apiPackageRoot(), ".storage", "files");

  createObjectKey(ownerId: string): string {
    return `private/${ownerId}/${randomUUID()}`;
  }

  async write(objectKey: string, buffer: Buffer): Promise<void> {
    const target = this.pathFor(objectKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer);
  }

  async remove(objectKey: string): Promise<void> {
    await unlink(this.pathFor(objectKey)).catch(() => undefined);
  }

  async stream(objectKey: string) {
    const target = this.pathFor(objectKey);
    await access(target).catch(() => {
      throw new NotFoundException("FILE_OBJECT_NOT_FOUND");
    });
    return createReadStream(target);
  }

  private pathFor(objectKey: string): string {
    const target = path.resolve(this.root, objectKey);
    const root = path.resolve(this.root);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      throw new NotFoundException("FILE_OBJECT_NOT_FOUND");
    }
    return target;
  }

  private apiPackageRoot(): string {
    const cwd = process.cwd();
    if (this.isApiPackage(cwd)) return cwd;

    const nested = path.join(cwd, "apps", "api");
    if (this.isApiPackage(nested)) return nested;

    return cwd;
  }

  private isApiPackage(directory: string): boolean {
    const packageJson = path.join(directory, "package.json");
    if (!existsSync(packageJson)) return false;

    try {
      const parsed = JSON.parse(readFileSync(packageJson, "utf8")) as { name?: unknown };
      return parsed.name === "@moecraft/api";
    } catch {
      return false;
    }
  }
}
