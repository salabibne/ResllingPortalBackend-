import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class UpdateSizeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
