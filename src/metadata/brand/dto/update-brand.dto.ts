import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class UpdateBrandDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
