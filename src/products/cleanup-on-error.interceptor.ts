import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CleanupOnErrorInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            catchError((err) => {
                const req = context.switchToHttp().getRequest();
                const files: Express.Multer.File[] = req.files || (req.file ? [req.file] : []);

                // Si ocurrió un error y hay archivos subidos en esta petición, los eliminamos
                if (files && files.length > 0) {
                    files.forEach((file) => {
                        const filePath = path.resolve(file.path);
                        if (fs.existsSync(filePath)) {
                            fs.unlink(filePath, (unlinkErr) => {
                                if (unlinkErr) {
                                    console.error(`Error eliminando archivo huérfano: ${filePath}`, unlinkErr);
                                }
                            });
                        }
                    });
                }

                // Re-lanzamos el error original para que NestJS lo maneje con sus ExceptionFilters
                return throwError(() => err);
            }),
        );
    }
}