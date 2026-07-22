import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AttributeTemplateDto, BrandDto, CategoryDto, CharacterDto, FranchiseDto, TagDto } from "./catalog.dto";
import type { CatalogProductQueryDto } from "./catalog.dto";
import type { PublicProductCard, PublicProductDetail, PublicProductSearchResult } from "@moecraft/shared";

const PUBLIC_PRODUCT_INCLUDE = {
  store: true,
  category: true,
  brand: true,
  franchise: true,
  skus: { where: { isActive: true }, include: { inventory: true }, orderBy: { priceAmount: "asc" as const } },
  media: { orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }] }
} satisfies Prisma.ProductInclude;

@Injectable()
export class CatalogService {
  private readonly publicProductInclude = PUBLIC_PRODUCT_INCLUDE;
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
      this.prisma.product.findMany({ where: { status: "ACTIVE", store: { isOpen: true, merchant: { status: "ACTIVE" } } }, include: { store: true, category: true, brand: true, franchise: true, skus: { where: { isActive: true }, include: { inventory: true }, orderBy: { priceAmount: "asc" } }, media: { where: { kind: "IMAGE" }, orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] } }, orderBy: { updatedAt: "desc" }, take: 12 })
    ]);
    return {
      categories: categories.map((item) => this.base(item, item._count.products)),
      brands: brands.map((item) => this.base(item, item._count.products)),
      franchises: franchises.map((item) => ({ ...this.base(item, item._count.products), characterCount: item._count.characters })),
      characters: characters.map((item) => ({ ...this.base(item, item._count.products), franchiseId: item.franchiseId, franchiseName: item.franchise.nameZhCn })),
      tags: tags.map((item) => this.base(item, item._count.products)),
      attributeTemplates: attributeTemplates.map((item) => ({ ...item, options: this.stringArray(item.options), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })),
      products: products.map((item) => this.productCard(item))
    };
  }

  async searchProducts(query: CatalogProductQueryDto): Promise<PublicProductSearchResult> {
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) throw new BadRequestException("INVALID_PRICE_RANGE");
    const keyword = query.q?.trim();
    const price: Prisma.IntFilter = {};
    if (query.minPrice !== undefined) price.gte = query.minPrice;
    if (query.maxPrice !== undefined) price.lte = query.maxPrice;
    const where: Prisma.ProductWhereInput = {
      status: "ACTIVE",
      store: { isOpen: true, merchant: { status: "ACTIVE" }, ...(query.store ? { slug: query.store } : {}) },
      ...(query.category ? { category: { slug: query.category, isActive: true } } : {}),
      ...(query.brand ? { brand: { slug: query.brand, isActive: true } } : {}),
      ...(query.franchise ? { franchise: { slug: query.franchise, isActive: true } } : {}),
      ...(query.saleType ? { saleType: query.saleType } : {}),
      skus: { some: { isActive: true, ...(Object.keys(price).length ? { priceAmount: price } : {}) } },
      ...(keyword ? { OR: [
        { titleZhCn: { contains: keyword } }, { titleEnUs: { contains: keyword } },
        { descriptionZhCn: { contains: keyword } }, { category: { nameZhCn: { contains: keyword } } },
        { brand: { nameZhCn: { contains: keyword } } }, { franchise: { nameZhCn: { contains: keyword } } },
        { character: { nameZhCn: { contains: keyword } } }, { skus: { some: { isActive: true, OR: [{ code: { contains: keyword } }, { nameZhCn: { contains: keyword } }] } } }
      ] } : {})
    };
    const products = await this.prisma.product.findMany({
      where,
      include: this.publicProductInclude,
      orderBy: { updatedAt: "desc" },
      take: 1000
    });
    let items = products.map((item) => this.productCard(item));
    if (query.inStock !== undefined) items = items.filter((item) => item.inStock === (query.inStock === "true"));
    const sort = query.sort ?? (keyword ? "RELEVANCE" : "NEWEST");
    if (sort === "PRICE_ASC") items.sort((a, b) => (a.priceAmount ?? Number.MAX_SAFE_INTEGER) - (b.priceAmount ?? Number.MAX_SAFE_INTEGER));
    else if (sort === "PRICE_DESC") items.sort((a, b) => (b.priceAmount ?? -1) - (a.priceAmount ?? -1));
    else if (sort === "SALES") items.sort((a, b) => b.salesCount - a.salesCount || b.updatedAt.localeCompare(a.updatedAt));
    else if (sort === "NEWEST") items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    else if (keyword) items.sort((a, b) => this.relevance(b, keyword) - this.relevance(a, keyword) || b.updatedAt.localeCompare(a.updatedAt));
    const total = items.length;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 24;
    return { items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async productDetail(id: string): Promise<PublicProductDetail> {
    const item = await this.prisma.product.findFirst({ where: { id, status: "ACTIVE", store: { isOpen: true, merchant: { status: "ACTIVE" } } }, include: { ...this.publicProductInclude, character: true, tags: { where: { isActive: true } } } });
    if (!item) throw new NotFoundException("PRODUCT_NOT_FOUND");
    return {
      id: item.id, titleZhCn: item.titleZhCn, titleEnUs: item.titleEnUs, descriptionZhCn: item.descriptionZhCn, descriptionEnUs: item.descriptionEnUs,
      material: item.material, scale: item.scale, manufacturer: item.manufacturer, copyrightNotice: item.copyrightNotice, saleType: item.saleType,
      presaleNotice: item.presaleNotice, shippingWindowStart: item.shippingWindowStart?.toISOString() ?? null, shippingWindowEnd: item.shippingWindowEnd?.toISOString() ?? null,
      afterSalesSummary: item.afterSalesSummary, category: this.catalogReference(item.category), brand: this.catalogReference(item.brand), franchise: this.catalogReference(item.franchise), character: this.catalogReference(item.character),
      tags: item.tags.map((tag) => this.catalogReference(tag)!),
      store: { id: item.store.id, name: item.store.name, slug: item.store.slug, logoFileId: item.store.logoFileId, description: item.store.description, customerServiceEmail: item.store.customerServiceEmail, customerServicePhone: item.store.customerServicePhone },
      media: item.media.map((media) => ({ id: media.id, fileId: media.fileId, kind: media.kind as "IMAGE" | "VIDEO", altZhCn: media.altZhCn, altEnUs: media.altEnUs, isCover: media.isCover })),
      skus: item.skus.map((sku) => { const available = Math.max(0, (sku.inventory?.onHand ?? 0) - (sku.inventory?.reserved ?? 0)); return { id: sku.id, code: sku.code, nameZhCn: sku.nameZhCn, nameEnUs: sku.nameEnUs, optionValues: this.stringRecord(sku.optionValues), priceAmount: sku.priceAmount, currency: sku.currency, available, inStock: available > 0 }; }),
      salesCount: item.salesCount, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString()
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

  private productCard(item: PublicProductRecord): PublicProductCard {
    const available = item.skus.reduce((sum, sku) => sum + Math.max(0, (sku.inventory?.onHand ?? 0) - (sku.inventory?.reserved ?? 0)), 0);
    const cover = item.media.find((media) => media.kind === "IMAGE" && media.isCover) ?? item.media.find((media) => media.kind === "IMAGE");
    return {
      id: item.id, titleZhCn: item.titleZhCn, titleEnUs: item.titleEnUs, storeName: item.store.name, storeSlug: item.store.slug,
      categoryName: item.category?.nameZhCn ?? null, categorySlug: item.category?.slug ?? null, brandName: item.brand?.nameZhCn ?? null, brandSlug: item.brand?.slug ?? null,
      franchiseName: item.franchise?.nameZhCn ?? null, franchiseSlug: item.franchise?.slug ?? null, priceAmount: item.skus[0]?.priceAmount ?? null,
      currency: item.skus[0]?.currency ?? "CNY", available, inStock: available > 0, saleType: item.saleType, coverFileId: cover?.fileId ?? null,
      coverAlt: cover?.altZhCn ?? item.titleZhCn, salesCount: item.salesCount, updatedAt: item.updatedAt.toISOString()
    };
  }

  private relevance(item: PublicProductCard, keyword: string) {
    const query = keyword.toLocaleLowerCase();
    const title = `${item.titleZhCn} ${item.titleEnUs ?? ""}`.toLocaleLowerCase();
    if (title.startsWith(query)) return 4;
    if (title.includes(query)) return 3;
    if (`${item.franchiseName ?? ""} ${item.brandName ?? ""}`.toLocaleLowerCase().includes(query)) return 2;
    return 1;
  }

  private catalogReference(item: { id: string; slug: string; nameZhCn: string; nameEnUs: string | null } | null) {
    return item ? { id: item.id, slug: item.slug, nameZhCn: item.nameZhCn, nameEnUs: item.nameEnUs } : null;
  }

  private stringRecord(value: Prisma.JsonValue | null): Record<string, string> {
    if (!value || Array.isArray(value) || typeof value !== "object") return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
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

type PublicProductRecord = Prisma.ProductGetPayload<{ include: typeof PUBLIC_PRODUCT_INCLUDE }>;
