import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_ACCESS_SECRET, // Cambia esto a tu clave secreta
        });
    }

    // async validate(payload: any) {
    //     console.log("estoy en jwt strategy: ", payload);
    //     const user = await this.authService.parseAuthorizationHeaders(payload.sub);
    //     if (!user) {
    //         throw new UnauthorizedException();
    //     }
    //     return user;
    // }
    async validate(payload: any) {
        // console.log("validando usuario: ", payload);
        return { userId: payload.sub, username: payload.username };
    }
}
