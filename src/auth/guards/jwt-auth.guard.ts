import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        // const token = this.extractTokenFromHeader(request);
        // 🎯 Extrae el token (desde cookie o header)
        const token = this.extractToken(request);
        if (!token) {
            throw new UnauthorizedException('Token de autenticación no proporcionado');
        }

        try {
            // 💡 Validamos el token usando la firma/secreto de tus variables de entorno
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>('JWT_SECRET') || 'SUPER_SECRET_KEY_CHANGEME',
            });

            // 🎯 Súper importante: Adjuntamos el payload descodificado al request
            // para que el controlador pueda leer 'req.user.id'
            request['user'] = payload;
        } catch (error) {
            throw new UnauthorizedException('Token inválido o expirado');
        }

        return true;
    }

    /**
    * Intenta extraer el token de la cookie HttpOnly o del header Authorization
    */
    private extractToken(request: Request): string | undefined {
        // 1. Buscar en cookies procesadas por cookie-parser
        if (request.cookies && request.cookies['auth_token']) {
            return request.cookies['auth_token'];
        }

        // 2. Buscar manualmente en el header 'Cookie' (Fallback sin cookie-parser)
        if (request.headers.cookie) {
            const cookies = request.headers.cookie
                .split(';')
                .map((c) => c.trim().split('='))
                .reduce((acc, [key, val]) => {
                    acc[key] = val;
                    return acc;
                }, {} as Record<string, string>);

            if (cookies['auth_token']) {
                return cookies['auth_token'];
            }
        }

        // 3. Buscar en el header 'Authorization: Bearer <token>'
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}