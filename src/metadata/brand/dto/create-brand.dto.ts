import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  imageUrl!: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
