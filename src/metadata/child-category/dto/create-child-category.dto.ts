import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class CreateChildCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  @IsNotEmpty()
  subcategoryId!: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
