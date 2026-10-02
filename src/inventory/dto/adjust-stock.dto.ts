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
   * Optional incoming cost per unit (if provided, product purchasePrice remains default valuation).
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  incomingCostPerUnit?: number;
}
