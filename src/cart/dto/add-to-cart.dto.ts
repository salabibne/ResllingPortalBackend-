import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  @IsOptional()
  productSizeId?: string;

  @IsUUID()
  @IsOptional()
  productColorId?: string;

  @IsInt()
  @Min(1)
  quantity: number = 1;
}

