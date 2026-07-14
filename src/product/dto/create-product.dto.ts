import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { CommonStatus } from '../../../prisma/generated/client';

export class ProductImageDto {
  @IsString()
  @IsNotEmpty()
  imageUrl!: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsUUID()
  @IsOptional()
  subcategoryId?: string;

  @IsUUID()
  @IsOptional()
  childCategoryId?: string;

  @IsUUID()
  @IsNotEmpty()
  brandId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchasePrice!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  oldPrice!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  newPrice!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  resellerPrice!: number;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;

  @IsBoolean()
  @IsOptional()
  showAsNewArrival?: boolean;

  // --- Variant relation arrays ---

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  @IsOptional()
  images?: ProductImageDto[];

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  colorIds?: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  sizeIds?: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  ageVariantIds?: string[];

  // --- Inventory seed fields (auto-created with product) ---

  @IsString()
  @IsOptional()
  supplierName?: string;

  @IsString()
  @IsOptional()
  supplierMobile?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  stockLimitAlert?: number;
}
