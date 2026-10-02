import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PayoutMethod, WithdrawalStatus } from '../../../prisma/generated/client';

export class CreateWithdrawalDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(100, { message: 'Minimum withdrawal amount is ৳100' })
  @IsNotEmpty()
  amount!: number;

  @IsEnum(PayoutMethod, {
    message: 'Payout method must be BKASH, NAGAD, ROCKET, BANK_TRANSFER, or CASH',
  })
  @IsNotEmpty()
  payoutMethod!: PayoutMethod;

  @IsString()
  @IsNotEmpty({ message: 'Account details (phone number, bank details) are required' })
  accountDetails!: string;

  @IsString()
  @IsOptional()
  resellerNotes?: string;
}

export class CompleteWithdrawalDto {
  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  proofImageUrl?: string;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class RejectWithdrawalDto {
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason (admin notes) is required' })
  adminNotes!: string;
}

export class WithdrawalQueryDto {
  @IsEnum(WithdrawalStatus)
  @IsOptional()
  status?: WithdrawalStatus;

  @IsEnum(PayoutMethod)
  @IsOptional()
  payoutMethod?: PayoutMethod;

  @IsUUID()
  @IsOptional()
  resellerId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}
