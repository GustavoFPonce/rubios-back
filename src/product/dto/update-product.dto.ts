import { PartialType } from '@nestjs/mapped-types';

import { CreateProductDto } from './create-product.dto';
import { IsNumber, IsString } from 'class-validator';

export class UpdateProductDto{
    
  @IsString()
  readonly code: string;

  @IsString()
  readonly name: string;

  @IsNumber()
  readonly categoryId: number;

  @IsString()
  readonly description: string;

  @IsNumber()
  readonly pricePesos: number;

  @IsNumber()
  readonly priceDollar: number;
}
