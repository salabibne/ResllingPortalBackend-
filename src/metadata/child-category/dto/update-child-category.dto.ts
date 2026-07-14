import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class UpdateChildCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  subcategoryId?: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
