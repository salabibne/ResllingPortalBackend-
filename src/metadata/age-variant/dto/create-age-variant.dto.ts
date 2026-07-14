import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class CreateAgeVariantDto {
  @IsString()
  @IsNotEmpty()
  ageRange!: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
