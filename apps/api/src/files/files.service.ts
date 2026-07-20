import { BadRequestException, Injectable, NotFoundException, StreamableFile } from "@nestjs/common";
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

  async download(id: string): Promise<StreamableFile> {
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id, status: { notIn: ["DELETED", "QUARANTINED"] } }
    });
    if (!asset) throw new NotFoundException("FILE_NOT_FOUND");

    return new StreamableFile(await this.storage.stream(asset.objectKey), {
      type: asset.mimeType,
      length: asset.sizeBytes
    });
  }
}
