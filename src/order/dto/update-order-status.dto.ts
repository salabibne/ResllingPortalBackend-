import { IsEnum, IsOptional } from 'class-validator';
import {
  OrderProcessingStatus,
  PaymentStatus,
} from '../../../prisma/generated/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderProcessingStatus)
  @IsOptional()
  processingStatus?: OrderProcessingStatus;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;
}
