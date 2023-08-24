import { IsNumber, IsString } from 'class-validator';

export class CreateProductDto { 

  @IsString()
  readonly code: string;

  @IsString()
  readonly name: string;

  @IsNumber()
  readonly categoryId: number;

  @IsString()
  readonly description: string;

  @IsNumber()
  readonly stock: number;

  @IsNumber()
  readonly costPesos: number;

  @IsNumber()
  readonly costDollar: number;

  @IsNumber()
  readonly pricePesos: number;

  @IsNumber()
  readonly priceDollar: number;

}
