import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
