import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class CreateSubcategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
