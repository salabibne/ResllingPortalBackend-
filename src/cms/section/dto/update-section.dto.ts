import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class UpdateSectionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  cardTitle?: string;

  @IsString()
  @IsOptional()
  cardIcon?: string;

  @IsString()
  @IsOptional()
  cardDescription?: string;

  @IsString()
  @IsOptional()
  cardButton?: string;

  @IsString()
  @IsOptional()
  cardLink?: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
