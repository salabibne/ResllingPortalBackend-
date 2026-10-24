import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class CreateBrandDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  logoUrl?: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
