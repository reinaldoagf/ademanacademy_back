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
        const token = this.extractTokenFromHeader(request);

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
     * Helper para extraer el Bearer token del Header 'Authorization'
     */
    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}