import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCourierSettingDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  chargeText?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultCharge?: number;
}
