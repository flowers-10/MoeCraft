import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, Min } from "class-validator";

export class CatalogBaseDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @Length(2, 120) slug!: string;
  @IsString() @Length(1, 160) nameZhCn!: string;
  @IsOptional() @IsString() @Length(1, 160) nameEnUs?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class CategoryDto extends CatalogBaseDto { @IsOptional() @IsString() parentId?: string; @IsOptional() @IsString() @Length(1, 500) descriptionZhCn?: string; @IsOptional() @IsString() @Length(1, 500) descriptionEnUs?: string; }
export class BrandDto extends CatalogBaseDto { @IsOptional() @IsString() @Length(1, 500) descriptionZhCn?: string; @IsOptional() @IsString() @Length(1, 500) descriptionEnUs?: string; }
export class FranchiseDto extends BrandDto {}
export class CharacterDto extends CatalogBaseDto { @IsString() franchiseId!: string; }
export class TagDto extends CatalogBaseDto {}
export class AttributeTemplateDto {
  @IsString() @Matches(/^[a-z][a-z0-9_]*$/) @Length(2, 80) code!: string;
  @IsString() @Length(1, 120) nameZhCn!: string;
  @IsOptional() @IsString() @Length(1, 120) nameEnUs?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsIn(["TEXT", "NUMBER", "SELECT", "MULTI_SELECT", "BOOLEAN"]) inputType!: "TEXT" | "NUMBER" | "SELECT" | "MULTI_SELECT" | "BOOLEAN";
  @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
  @IsOptional() @IsBoolean() isRequired?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class CatalogStatusDto { @IsBoolean() isActive!: boolean; }
