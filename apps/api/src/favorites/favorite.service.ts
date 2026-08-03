import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { FavoriteView } from "@moecraft/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}
  async toggle(userId: string, targetType: string, targetId: string): Promise<{ favorited: boolean }> {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId } }
    });
    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await this.prisma.favorite.create({ data: { userId, targetType, targetId } });
    return { favorited: true };
  }
  async list(userId: string, targetType?: string): Promise<FavoriteView[]> {
    const where: Prisma.FavoriteWhereInput = { userId };
    if (targetType) where.targetType = targetType;
    return this.prisma.favorite.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }).then(r => r.map(f => ({ id: f.id, targetType: f.targetType as FavoriteView["targetType"], targetId: f.targetId, createdAt: f.createdAt.toISOString() })));
  }
  async check(userId: string, targetType: string, targetId: string): Promise<{ favorited: boolean }> {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId } }
    });
    return { favorited: !!existing };
  }
}
