import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AttributeTemplateDto, BrandDto, CategoryDto, CharacterDto, FranchiseDto, TagDto } from "./catalog.dto";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(publicOnly = false) {
    const active = publicOnly ? { isActive: true } : {};
    const [categories, brands, franchises, characters, tags, attributeTemplates, products] = await Promise.all([
      this.prisma.category.findMany({ where: active, include: { _count: { select: { products: true } } }, orderBy: [{ sortOrder: "asc" }, { nameZhCn: "asc" }] }),
      this.prisma.brand.findMany({ where: active, include: { _count: { select: { products: true } } }, orderBy: [{ sortOrder: "asc" }, { nameZhCn: "asc" }] }),
      this.prisma.franchise.findMany({ where: active, include: { _count: { select: { products: true, characters: true } } }, orderBy: [{ sortOrder: "asc" }, { nameZhCn: "asc" }] }),
      this.prisma.character.findMany({ where: active, include: { franchise: true, _count: { select: { products: true } } }, orderBy: [{ sortOrder: "asc" }, { nameZhCn: "asc" }] }),
      this.prisma.tag.findMany({ where: active, include: { _count: { select: { products: true } } }, orderBy: [{ sortOrder: "asc" }, { nameZhCn: "asc" }] }),
      this.prisma.attributeTemplate.findMany({ where: active, orderBy: [{ sortOrder: "asc" }, { nameZhCn: "asc" }] }),
      this.prisma.product.findMany({ where: { status: "ACTIVE", store: { isOpen: true, merchant: { status: "ACTIVE" } } }, include: { store: true, category: true, brand: true, franchise: true, skus: { include: { inventory: true }, orderBy: { priceAmount: "asc" } } }, orderBy: { updatedAt: "desc" }, take: 12 })
    ]);
    return {
      categories: categories.map((item) => this.base(item, item._count.products)),
      brands: brands.map((item) => this.base(item, item._count.products)),
      franchises: franchises.map((item) => ({ ...this.base(item, item._count.products), characterCount: item._count.characters })),
      characters: characters.map((item) => ({ ...this.base(item, item._count.products), franchiseId: item.franchiseId, franchiseName: item.franchise.nameZhCn })),
      tags: tags.map((item) => this.base(item, item._count.products)),
      attributeTemplates: attributeTemplates.map((item) => ({ ...item, options: this.stringArray(item.options), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })),
      products: products.map((item) => ({ id: item.id, titleZhCn: item.titleZhCn, titleEnUs: item.titleEnUs, storeName: item.store.name, storeSlug: item.store.slug, categoryName: item.category?.nameZhCn ?? null, brandName: item.brand?.nameZhCn ?? null, franchiseName: item.franchise?.nameZhCn ?? null, priceAmount: item.skus[0]?.priceAmount ?? null, currency: item.skus[0]?.currency ?? "CNY", inStock: item.skus.some((sku) => (sku.inventory?.onHand ?? 0) - (sku.inventory?.reserved ?? 0) > 0) }))
    };
  }

  async saveCategory(id: string | undefined, dto: CategoryDto) { if (id) await this.assertCategoryParent(id, dto.parentId); return this.write(() => id ? this.prisma.category.update({ where: { id }, data: this.clean(dto) }) : this.prisma.category.create({ data: this.clean(dto) })); }
  saveBrand(id: string | undefined, dto: BrandDto) { return this.write(() => id ? this.prisma.brand.update({ where: { id }, data: this.clean(dto) }) : this.prisma.brand.create({ data: this.clean(dto) })); }
  saveFranchise(id: string | undefined, dto: FranchiseDto) { return this.write(() => id ? this.prisma.franchise.update({ where: { id }, data: this.clean(dto) }) : this.prisma.franchise.create({ data: this.clean(dto) })); }
  saveCharacter(id: string | undefined, dto: CharacterDto) { return this.write(() => id ? this.prisma.character.update({ where: { id }, data: this.clean(dto) }) : this.prisma.character.create({ data: this.clean(dto) })); }
  saveTag(id: string | undefined, dto: TagDto) { return this.write(() => id ? this.prisma.tag.update({ where: { id }, data: this.clean(dto) }) : this.prisma.tag.create({ data: this.clean(dto) })); }
  saveAttribute(id: string | undefined, dto: AttributeTemplateDto) { const data = { ...this.clean(dto), options: dto.options ? dto.options as Prisma.InputJsonValue : Prisma.JsonNull }; return this.write(() => id ? this.prisma.attributeTemplate.update({ where: { id }, data }) : this.prisma.attributeTemplate.create({ data })); }

  async setStatus(type: string, id: string, isActive: boolean) {
    if (type === "categories") return this.prisma.category.update({ where: { id }, data: { isActive } });
    if (type === "brands") return this.prisma.brand.update({ where: { id }, data: { isActive } });
    if (type === "franchises") return this.prisma.franchise.update({ where: { id }, data: { isActive } });
    if (type === "characters") return this.prisma.character.update({ where: { id }, data: { isActive } });
    if (type === "tags") return this.prisma.tag.update({ where: { id }, data: { isActive } });
    if (type === "attribute-templates") return this.prisma.attributeTemplate.update({ where: { id }, data: { isActive } });
    throw new NotFoundException("CATALOG_TYPE_NOT_FOUND");
  }

  async remove(type: string, id: string) {
    const references = await this.referenceCount(type, id);
    if (references > 0) { await this.setStatus(type, id, false); return { deleted: false, disabled: true, references }; }
    if (type === "categories") await this.prisma.category.delete({ where: { id } });
    else if (type === "brands") await this.prisma.brand.delete({ where: { id } });
    else if (type === "franchises") await this.prisma.franchise.delete({ where: { id } });
    else if (type === "characters") await this.prisma.character.delete({ where: { id } });
    else if (type === "tags") await this.prisma.tag.delete({ where: { id } });
    else if (type === "attribute-templates") await this.prisma.attributeTemplate.delete({ where: { id } });
    else throw new NotFoundException("CATALOG_TYPE_NOT_FOUND");
    return { deleted: true, disabled: false, references: 0 };
  }

  private async assertCategoryParent(id: string, parentId?: string) { if (!parentId) return; if (id === parentId) throw new BadRequestException("CATEGORY_CYCLE"); let cursor: string | null = parentId; const visited = new Set<string>(); while (cursor) { if (cursor === id || visited.has(cursor)) throw new BadRequestException("CATEGORY_CYCLE"); visited.add(cursor); const parent: { parentId: string | null } | null = await this.prisma.category.findUnique({ where: { id: cursor }, select: { parentId: true } }); if (!parent) throw new NotFoundException("CATEGORY_PARENT_NOT_FOUND"); cursor = parent.parentId; } }
  private async referenceCount(type: string, id: string) { if (type === "categories") return (await this.prisma.category.count({ where: { parentId: id } })) + (await this.prisma.product.count({ where: { categoryId: id } })) + (await this.prisma.attributeTemplate.count({ where: { categoryId: id } })); if (type === "brands") return this.prisma.product.count({ where: { brandId: id } }); if (type === "franchises") return (await this.prisma.product.count({ where: { franchiseId: id } })) + (await this.prisma.character.count({ where: { franchiseId: id } })); if (type === "characters") return this.prisma.product.count({ where: { characterId: id } }); if (type === "tags") return this.prisma.product.count({ where: { tags: { some: { id } } } }); return 0; }
  private clean<T extends object>(dto: T) { return Object.fromEntries(Object.entries(dto).map(([key, value]) => [key, value === "" ? null : value])) as T; }
  private base<T extends { createdAt: Date; updatedAt: Date }>(item: T, productCount: number) { return { ...item, productCount, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
  private stringArray(value: Prisma.JsonValue | null) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
  private async write<T>(operation: () => Promise<T>) { try { return await operation(); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("CATALOG_SLUG_OR_CODE_EXISTS"); throw error; } }
}
