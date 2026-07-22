import { BadRequestException, ForbiddenException, Injectable, NotFoundException, StreamableFile } from "@nestjs/common";
import type { RequestPrincipal } from "../auth/authorization";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateFileDto } from "./files.dto";
import { LocalObjectStorageService } from "./local-object-storage.service";

export type UploadedFilePayload = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_FILE_SIZE_BYTES = 20_000_000;

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService, private readonly storage: LocalObjectStorageService) {}

  async create(ownerId: string, dto: CreateFileDto, file?: UploadedFilePayload) {
    if (!file?.buffer) throw new BadRequestException("FILE_REQUIRED");
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) throw new BadRequestException("UNSUPPORTED_FILE_TYPE");
    if (file.size < 1 || file.size > MAX_FILE_SIZE_BYTES) throw new BadRequestException("INVALID_FILE_SIZE");

    const objectKey = this.storage.createObjectKey(ownerId);
    await this.storage.write(objectKey, file.buffer);

    try {
      return await this.prisma.fileAsset.create({
        data: {
          ownerId,
          purpose: dto.purpose,
          objectKey,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          status: "READY"
        }
      });
    } catch (error) {
      await this.storage.remove(objectKey);
      throw error;
    }
  }

  async download(principal: RequestPrincipal, id: string): Promise<StreamableFile> {
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id, status: { notIn: ["DELETED", "QUARANTINED"] } }
    });
    if (!asset) throw new NotFoundException("FILE_NOT_FOUND");
    const platformAccess = principal.roles.some((role) => role === "PLATFORM_ADMIN" || role === "PLATFORM_OPERATOR");
    if (asset.ownerId !== principal.sub && !platformAccess) {
      const sameMerchant = await this.prisma.merchantMember.count({ where: { userId: principal.sub, merchant: { members: { some: { userId: asset.ownerId } } } } });
      if (!sameMerchant) throw new ForbiddenException("FILE_ACCESS_DENIED");
    }
    return this.stream(asset);
  }

  async publicDownload(id: string): Promise<StreamableFile> {
    const asset = await this.prisma.fileAsset.findFirst({ where: { id, status: "READY" } });
    if (!asset) throw new NotFoundException("FILE_NOT_FOUND");
    const [productUsage, storeUsage] = await Promise.all([
      this.prisma.productMedia.count({ where: { fileId: id, kind: "IMAGE", product: { status: "ACTIVE", store: { isOpen: true, merchant: { status: "ACTIVE" } } } } }),
      this.prisma.store.count({ where: { isOpen: true, merchant: { status: "ACTIVE" }, OR: [{ logoFileId: id }, { bannerFileId: id }] } })
    ]);
    if (!productUsage && !storeUsage) throw new NotFoundException("PUBLIC_FILE_NOT_FOUND");
    return this.stream(asset);
  }

  private async stream(asset: { objectKey: string; mimeType: string; sizeBytes: number }): Promise<StreamableFile> {
    return new StreamableFile(await this.storage.stream(asset.objectKey), {
      type: asset.mimeType,
      length: asset.sizeBytes
    });
  }
}
