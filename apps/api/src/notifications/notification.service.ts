import { Injectable } from "@nestjs/common";
import type { NotificationView } from "@moecraft/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string, unreadOnly: boolean): Promise<NotificationView[]> {
    const where: Prisma.NotificationWhereInput = { userId };
    if (unreadOnly) where.isRead = false;
    const rows = await this.prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map(r => ({ id: r.id, type: r.type, title: r.title, body: r.body, isRead: r.isRead, referenceType: r.referenceType, referenceId: r.referenceId, createdAt: r.createdAt.toISOString() }));
  }
  async markRead(userId: string, id: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  }
  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }
  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }
  async create(userId: string, type: string, title: string, body: string, referenceType?: string, referenceId?: string) {
    return this.prisma.notification.create({ data: { userId, type, title, body, referenceType, referenceId } });
  }
}
