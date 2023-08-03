import { IsEmail, IsPhoneNumber, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  readonly lastName: string;

  @IsString()
  readonly name: string;

  @IsString()
  readonly address: string;

  @IsString()
  readonly phoneNumber: string;

  @IsString()
  readonly userName: string;

  @IsString()
  readonly email: string;

  @IsString()
  readonly password: string;

  @IsString()
  readonly roleName: string;
}
