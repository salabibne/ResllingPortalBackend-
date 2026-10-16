import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SupportTicketReason, SupportTicketStatus } from '../../../prisma/generated/client';

export class CreateSupportTicketDto {
  @IsEnum(SupportTicketReason)
  reason!: SupportTicketReason;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;
}

export class UpdateSupportTicketStatusDto {
  @IsEnum(SupportTicketStatus)
  status!: SupportTicketStatus;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class SupportTicketQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
