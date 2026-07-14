import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class CreateSizeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
