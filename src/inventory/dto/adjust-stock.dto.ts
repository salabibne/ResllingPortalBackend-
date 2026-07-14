import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  InventoryTxPurpose,
  InventoryTxType,
} from '../../../prisma/generated/client';

export class AdjustStockDto {
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @IsUUID()
  @IsOptional()
  productSizeId?: string;

  @IsInt()
  @Min(1)
  transactionQuantity!: number;

  @IsEnum(InventoryTxType)
  stockType!: InventoryTxType;

  @IsEnum(InventoryTxPurpose)
  purpose!: InventoryTxPurpose;

  @IsUUID()
  @IsNotEmpty()
  performedBy!: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  /**
   * Required when stockType = STOCK_IN and purpose = PURCHASE.
   * Used for weighted moving average cost calculation.
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  incomingCostPerUnit?: number;
}
