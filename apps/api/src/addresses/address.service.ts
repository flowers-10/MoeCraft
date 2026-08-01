import { Injectable, NotFoundException } from "@nestjs/common";
import type { Address } from "@prisma/client";
import type { ShippingAddressView } from "@moecraft/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateAddressDto, UpdateAddressDto } from "./address.dto";

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<ShippingAddressView[]> {
    const rows = await this.prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] });
    return rows.map((row) => this.view(row));
  }

  async create(userId: string, dto: CreateAddressDto): Promise<ShippingAddressView> {
    const row = await this.prisma.$transaction(async (tx) => {
      const isDefault = dto.isDefault === true || await tx.address.count({ where: { userId } }) === 0;
      if (isDefault) await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      return tx.address.create({ data: { userId, ...this.createData(dto), isDefault } });
    });
    return this.view(row);
  }

  async update(userId: string, id: string, dto: UpdateAddressDto): Promise<ShippingAddressView> {
    const existing = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException("ADDRESS_NOT_FOUND");
    const row = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: { ...this.updateData(dto), ...(dto.isDefault === true ? { isDefault: true } : {}) } });
    });
    return this.view(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException("ADDRESS_NOT_FOUND");
    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      if (existing.isDefault) {
        const replacement = await tx.address.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { id: true } });
        if (replacement) await tx.address.update({ where: { id: replacement.id }, data: { isDefault: true } });
      }
    });
  }

  private createData(dto: CreateAddressDto) {
    return {
      recipient: dto.recipient.trim(), phone: dto.phone.trim(), country: dto.country.trim(), province: dto.province.trim(),
      city: dto.city.trim(), district: dto.district.trim(), addressLine: dto.addressLine.trim(), postalCode: dto.postalCode?.trim() || null
    };
  }

  private updateData(dto: UpdateAddressDto) {
    return {
      ...(dto.recipient !== undefined ? { recipient: dto.recipient.trim() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
      ...(dto.country !== undefined ? { country: dto.country.trim() } : {}),
      ...(dto.province !== undefined ? { province: dto.province.trim() } : {}),
      ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
      ...(dto.district !== undefined ? { district: dto.district.trim() } : {}),
      ...(dto.addressLine !== undefined ? { addressLine: dto.addressLine.trim() } : {}),
      ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode.trim() || null } : {})
    };
  }

  private view(row: Address): ShippingAddressView {
    return {
      id: row.id, recipient: row.recipient, phone: row.phone, country: row.country, province: row.province, city: row.city,
      district: row.district, addressLine: row.addressLine, ...(row.postalCode ? { postalCode: row.postalCode } : {}),
      isDefault: row.isDefault, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString()
    };
  }
}
