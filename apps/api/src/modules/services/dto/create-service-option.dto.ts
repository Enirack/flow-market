import { IsNumber, IsString, MinLength } from 'class-validator';

export class CreateServiceOptionDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsNumber()
  priceDelta!: number;
}
