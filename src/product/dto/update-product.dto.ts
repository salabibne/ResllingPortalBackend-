import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { CommonStatus } from '../../../prisma/generated/client';
import { ProductImageDto } from './create-product.dto';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  subcategoryId?: string | null;

  @IsUUID()
  @IsOptional()
  childCategoryId?: string | null;

  @IsUUID()
  @IsOptional()
  brandId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  purchasePrice?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  oldPrice?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  newPrice?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  resellerPrice?: number;

  @IsString()
  @IsOptional()
  videoUrl?: string | null;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;

  @IsBoolean()
  @IsOptional()
  showAsNewArrival?: boolean;

  // --- Variant relation arrays (relation diffing) ---

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
}
