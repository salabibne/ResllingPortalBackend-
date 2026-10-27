import { IsEnum, IsOptional } from 'class-validator';
import { PaymentStatus } from '../../../prisma/generated/client';

/** Only the payment status is editable; the order status comes from the courier. */
export class UpdateOrderStatusDto {
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;
}
