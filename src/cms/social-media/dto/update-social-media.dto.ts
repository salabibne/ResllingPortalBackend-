import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class UpdateSocialMediaDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  iconName?: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
