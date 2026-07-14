import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class UpdateSubcategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
