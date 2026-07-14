import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class UpdateAgeVariantDto {
  @IsString()
  @IsOptional()
  ageRange?: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
