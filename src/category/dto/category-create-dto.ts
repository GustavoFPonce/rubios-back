import { IsString } from "class-validator";

export class CategoryCreateDto{
    @IsString()
    readonly name: string;
}