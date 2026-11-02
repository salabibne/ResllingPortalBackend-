import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaymentMethod } from '../../../prisma/generated/client';

export class ResellerOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsOptional()
  productSizeId?: string;

  @IsString()
  @IsOptional()
  productColorId?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  resellerSellingPrice?: number;
}

export class CreateResellerOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResellerOrderItemDto)
  items!: ResellerOrderItemDto[];

  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @IsString()
  @IsOptional()
  customerSecondaryPhone?: string;

  // Optional: a blank value is treated as not provided.
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsOptional()
  @IsEmail({}, { message: 'Customer email must be a valid email address' })
  @MaxLength(255)
  customerEmail?: string;

  @IsString()
  @IsNotEmpty()
  customerDistrict!: string;

  @IsString()
  @IsNotEmpty()
  customerThana!: string;

  @IsString()
  @IsNotEmpty()
  shippingAddress!: string;

  @IsNumber()
  @Min(0)
  courierCharge!: number;

  @IsBoolean()
  @IsOptional()
  isAdvanceCourierPaid?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  advanceCourierAmount?: number;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsString()
  @IsOptional()
  notes?: string;
}
