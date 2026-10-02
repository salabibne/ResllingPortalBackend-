import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class SaveExternalApiDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  apiName!: string;

  @IsString()
  apiUrl!: string;

  @IsString()
  credentials!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CommonStatus)
  status?: CommonStatus;

  @IsOptional()
  @IsString()
  createdAt?: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;
}
