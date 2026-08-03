import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsNotEmpty()
  cardTitle!: string;

  @IsString()
  @IsNotEmpty()
  cardIcon!: string;

  @IsString()
  @IsNotEmpty()
  cardDescription!: string;

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
