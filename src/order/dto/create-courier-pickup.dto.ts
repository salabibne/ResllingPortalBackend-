import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCourierPickupDto {
  @IsString()
  @MaxLength(250)
  address!: string;

  @IsString()
  @Matches(/^(?:\+?88)?01\d{9}$/, {
    message: 'contactNumber must be an 11-digit Bangladesh phone number',
  })
  contactNumber!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  policeStationId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addressId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimQty?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
