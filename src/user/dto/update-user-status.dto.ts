import { CommonStatus } from '../../../prisma/generated/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  @IsEnum(CommonStatus)
  @IsNotEmpty()
  status!: CommonStatus;
}
