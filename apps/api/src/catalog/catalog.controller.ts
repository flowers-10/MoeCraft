import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { RequirePermissions } from "../auth/authorization";
import { AttributeTemplateDto, BrandDto, CatalogProductQueryDto, CatalogStatusDto, CategoryDto, CharacterDto, FranchiseDto, TagDto } from "./catalog.dto";
import { CatalogService } from "./catalog.service";

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get("catalog/public") publicOverview() { return this.catalog.overview(true); }
  @Get("catalog/products") publicProducts(@Query() query: CatalogProductQueryDto) { return this.catalog.searchProducts(query); }
  @Get("catalog/products/:id") publicProduct(@Param("id") id: string) { return this.catalog.productDetail(id); }
  @Get("catalog/admin") @RequirePermissions("catalog:manage") adminOverview() { return this.catalog.overview(); }

  @Post("catalog/categories") @RequirePermissions("catalog:manage") createCategory(@Body() dto: CategoryDto) { return this.catalog.saveCategory(undefined, dto); }
  @Put("catalog/categories/:id") @RequirePermissions("catalog:manage") updateCategory(@Param("id") id: string, @Body() dto: CategoryDto) { return this.catalog.saveCategory(id, dto); }
  @Post("catalog/brands") @RequirePermissions("catalog:manage") createBrand(@Body() dto: BrandDto) { return this.catalog.saveBrand(undefined, dto); }
  @Put("catalog/brands/:id") @RequirePermissions("catalog:manage") updateBrand(@Param("id") id: string, @Body() dto: BrandDto) { return this.catalog.saveBrand(id, dto); }
  @Post("catalog/franchises") @RequirePermissions("catalog:manage") createFranchise(@Body() dto: FranchiseDto) { return this.catalog.saveFranchise(undefined, dto); }
  @Put("catalog/franchises/:id") @RequirePermissions("catalog:manage") updateFranchise(@Param("id") id: string, @Body() dto: FranchiseDto) { return this.catalog.saveFranchise(id, dto); }
  @Post("catalog/characters") @RequirePermissions("catalog:manage") createCharacter(@Body() dto: CharacterDto) { return this.catalog.saveCharacter(undefined, dto); }
  @Put("catalog/characters/:id") @RequirePermissions("catalog:manage") updateCharacter(@Param("id") id: string, @Body() dto: CharacterDto) { return this.catalog.saveCharacter(id, dto); }
  @Post("catalog/tags") @RequirePermissions("catalog:manage") createTag(@Body() dto: TagDto) { return this.catalog.saveTag(undefined, dto); }
  @Put("catalog/tags/:id") @RequirePermissions("catalog:manage") updateTag(@Param("id") id: string, @Body() dto: TagDto) { return this.catalog.saveTag(id, dto); }
  @Post("catalog/attribute-templates") @RequirePermissions("catalog:manage") createAttribute(@Body() dto: AttributeTemplateDto) { return this.catalog.saveAttribute(undefined, dto); }
  @Put("catalog/attribute-templates/:id") @RequirePermissions("catalog:manage") updateAttribute(@Param("id") id: string, @Body() dto: AttributeTemplateDto) { return this.catalog.saveAttribute(id, dto); }
  @Patch("catalog/:type/:id/status") @RequirePermissions("catalog:manage") status(@Param("type") type: string, @Param("id") id: string, @Body() dto: CatalogStatusDto) { return this.catalog.setStatus(type, id, dto.isActive); }
  @Delete("catalog/:type/:id") @RequirePermissions("catalog:manage") remove(@Param("type") type: string, @Param("id") id: string) { return this.catalog.remove(type, id); }
}
