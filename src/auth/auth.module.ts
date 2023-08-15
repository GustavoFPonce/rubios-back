import { Module } from '@nestjs/common';

import { UserModule } from '../user/user.module';
import { TokenModule } from '../token/token.module';

import { AuthController } from './auth.controller';

import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [PassportModule, UserModule, TokenModule,
    JwtModule.register({
      secret: 'mySuperSecretKey', // Cambia esto a tu clave secreta
      signOptions: { expiresIn: '1h' }, // Configura el tiempo de expiración
    }),],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule { }
