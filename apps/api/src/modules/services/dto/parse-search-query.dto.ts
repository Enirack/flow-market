import { IsString, MinLength } from 'class-validator';

export class ParseSearchQueryDto {
  @IsString()
  @MinLength(2)
  query!: string;
}
