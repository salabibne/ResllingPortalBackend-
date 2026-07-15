import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  InventoryTxPurpose,
  InventoryTxType,
} from '../../../prisma/generated/client';

// ─── DASHBOARD ────────────────────────────────────────────────────────

export class DashboardQueryDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

// ─── LOW STOCK ALERTS ─────────────────────────────────────────────────

export class LowStockQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeOutOfStock?: boolean = true;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

// ─── TRANSACTION LOG ──────────────────────────────────────────────────

export class TransactionLogQueryDto {
  @IsUUID()
  @IsOptional()
  inventoryId?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  productSizeId?: string;

  @IsEnum(InventoryTxType)
  @IsOptional()
  stockType?: InventoryTxType;

  @IsEnum(InventoryTxPurpose)
  @IsOptional()
  purpose?: InventoryTxPurpose;

  @IsUUID()
  @IsOptional()
  performedBy?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @IsIn(['createdAt', 'transactionQuantity'])
  @IsOptional()
  sortBy?: 'createdAt' | 'transactionQuantity' = 'createdAt';

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// ─── PRODUCT SUMMARY ──────────────────────────────────────────────────

export class ProductSummaryQueryDto {
  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
