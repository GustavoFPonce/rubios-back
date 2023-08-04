import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcryptjs';

import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginUserDto } from '../user/dto/login-user.dto';

import { UserService } from '../user/user.service';
import { TokenService } from '../token/token.service';
import { RoleService } from 'src/role/role.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) { }

  async login(userDto: LoginUserDto) {
    const {id} = await this.validateUser(userDto);
    //console.log("response validation user: ", responseValidation);
    const token = await this.tokenService.generateTokens(id);
    console.log("token generado: ", token);
    return token;
   // return null;
  }

  async logout(refreshToken) {
    try {
      const { id } = await this.tokenService.verifyRefreshToken(refreshToken);

      return this.tokenService.removeRefreshToken(id);
    } catch (e) { }
  }

  async registration(userDto: CreateUserDto) {
    const candidate = await this.userService.findOneByEmail(userDto.email);
    console.log("existe email: ", candidate);

    if (candidate) return null;

    const hashedPassword = await bcrypt.hash(userDto.password, 7);
    const response: any = await this.userService.create({
      ...userDto,
      password: hashedPassword,
    });

    return response;
    // const token = await this.tokenService.generateTokens(user.id);
    // console.log("token: ", token);
    // return token;
  }

  async updateAccessToken(refreshToken: string) {
    const id = await this.tokenService.isRefreshTokenValid(refreshToken);

    const { accessToken } = await this.tokenService.generateTokens(id);

    return accessToken;
  }

  async parseAuthorizationHeaders(authHeaders: string) {
    const tokenType = authHeaders.split(' ')[0];
    const token = authHeaders.split(' ')[1];

    if (!token || tokenType !== 'Bearer') {
      throw new UnauthorizedException('Incorrect auth headers');
    }

    const payload = this.tokenService.verifyAccessToken(token);

    return payload;
  }

  private async validateUser(userDto: LoginUserDto) {
    const user = await this.userService.findOneByEmail(userDto.email);
    console.log("user validation: ", user);
    if (!user) {
      throw new NotFoundException(
        `El email ${userDto.email} no se encuentra registrado`,
      );
    }

    const passwordEquals = await bcrypt.compare(
      userDto.password,
      user.password,
    );

    if (passwordEquals) {
      return user;
    }

    throw new UnauthorizedException({ message: 'Contraseña incorrecta' });
  }
}
