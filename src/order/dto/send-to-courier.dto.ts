import { IsOptional, IsString, IsNumber, IsIn, IsArray } from 'class-validator';

export class SendToCourierDto {
  @IsOptional()
  @IsNumber()
  @IsIn([0, 1])
  deliveryType?: number; // 0 = Home delivery, 1 = Hub / Point delivery

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  codAmount?: number;
}

export class BulkSendCourierDto {
  @IsArray()
  @IsString({ each: true })
  orderIds!: string[];

  @IsOptional()
  @IsNumber()
  @IsIn([0, 1])
  deliveryType?: number;
}
