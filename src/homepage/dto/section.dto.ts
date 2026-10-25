import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SECTION_TYPES, HomepageSectionType } from '../section-registry';

export class CreateSectionDto {
  @IsIn(SECTION_TYPES)
  type!: HomepageSectionType;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  variant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  buttonText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  buttonLink?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  sortOrder?: number;
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  variant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  buttonText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  buttonLink?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  sortOrder?: number;
}

export class SectionOrderItemDto {
  @IsUUID()
  id!: string;

  @IsInt()
  @Min(1)
  @Max(999)
  sortOrder!: number;
}

export class ReorderSectionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionOrderItemDto)
  sectionOrders!: SectionOrderItemDto[];
}
