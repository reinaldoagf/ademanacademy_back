import { Controller, Get, Post, Body, Patch, Param, Query, Delete, HttpCode, HttpStatus, UseGuards, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PaymentOrdersService } from './payment-orders.service';
import { GetPaymentOrdersFilterDto } from './dto/get-payment-orders-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('payment-orders')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class PaymentOrdersController {
    constructor(private readonly paymentOrdersService: PaymentOrdersService) { }

    @Get()
    async findAll(@Query() filters: GetPaymentOrdersFilterDto) {
        return this.paymentOrdersService.findAll(filters);
    }

    @Get('my-orders/records')
    async findMyOrdersRecords(
        @CurrentUser() user: any, // 👈 El decorador extrae el user automáticamente
        @Query() filters: GetPaymentOrdersFilterDto,
    ) {
        // Extraemos el id de forma 100% segura y limpia
        const registeringUserId = user?.sub;
        // Por ahora, requerimos que el usuario lo envíe o usamos el 'sub' del token si lo configuras
        return this.paymentOrdersService.findMyOrdersRecords(registeringUserId, filters);
    }
    @Get('my-orders')
    async findMyOrders(
        @CurrentUser() user: any, // 👈 El decorador extrae el user automáticamente
        @Query() filters: GetPaymentOrdersFilterDto,
    ) {
        // Extraemos el id de forma 100% segura y limpia
        const userId = user?.sub;
        // Por ahora, requerimos que el usuario lo envíe o usamos el 'sub' del token si lo configuras
        return this.paymentOrdersService.findMyOrders(userId, filters);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.paymentOrdersService.findOne(id);
    }


    @Post(':id/record')
    @UseInterceptors(
        FileInterceptor('receiptFile', {
            storage: diskStorage({
                // 📂 Carpeta donde se guardarán los archivos en la raíz de tu proyecto NestJS
                destination: './uploads/receipts',
                filename: (req, file, callback) => {
                    // ✨ Generamos un nombre único: timestamp + caracteres aleatorios + extensión original
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `receipt-${uniqueSuffix}${ext}`);
                },
            }),
            // Opcional: Validar que solo suban imágenes o PDFs
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
                    return callback(new BadRequestException('Solo se permiten archivos JPG, PNG o PDF.'), false);
                }
                callback(null, true);
            },
        }),
    )
    async completeOnboarding(@Param('id') id: string,
        @CurrentUser() user: any,
        @Body() body: any,
        @UploadedFile() file: Express.Multer.File,
    ) {

        if (!file && user.isAdmin === false) {
            throw new BadRequestException('Debes adjuntar el comprobante de pago.');
        }

        const dto = {
            id,
            referenceNumber: body.referenceNumber,
            bankName: body.bankName,
            amount: parseFloat(body.amount),
            file,
            userId: user.sub,
            status: user.isAdmin === true ? 'approved' : 'pending',
        };

        // 🚀 Pasamos el objeto "file" completo al servicio
        return this.paymentOrdersService.record(dto, file);
    }
}