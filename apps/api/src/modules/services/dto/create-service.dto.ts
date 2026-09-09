import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min, MinLength } from 'class-validator';

const PRICE_TYPES = ['FIXED', 'HOURLY', 'PACKAGE'] as const;

export class CreateServiceDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(20, { message: 'description must be at least 20 characters' })
  description!: string;

  @IsIn(PRICE_TYPES)
  priceType!: (typeof PRICE_TYPES)[number];

  @IsNumber()
  @IsPositive()
  basePrice!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;
}
