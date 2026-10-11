// src/notifications/mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailsService {
    private readonly logger = new Logger(MailsService.name);
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST, // smtp.gmail.com
            port: Number(process.env.SMTP_PORT), // 465
            secure: true, // true para puerto 465
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            // 👇 AGREGAR ESTO PARA EVITAR EL ERROR DE CERTIFICADO EN LOCAL
            tls: {
                rejectUnauthorized: false,
            },
        });
    }

    async sendOtpEmail(toEmail: string, otpCode: string, studentName: string) {
        try {
            const mailOptions = {
                from: `"Academia de Danza" <${process.env.SMTP_USER}>`,
                to: toEmail,
                subject: 'Código de verificación - Academia',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
            <h2 style="color: #5e0472; text-align: center;">Código de Verificación</h2>
            <p>Hola <strong>${studentName}</strong>,</p>
            <p>Tu código de verificación de un solo uso (OTP) es:</p>
            <div style="background: #5e0472; color: #ffffff; font-size: 24px; font-weight: bold; text-align: center; padding: 15px; border-radius: 6px; letter-spacing: 4px; margin: 20px 0;">
              ${otpCode}
            </div>
            <p style="font-size: 12px; color: #666;">Este código expirará en 10 minutos.</p>
          </div>
        `,
            };

            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Correo OTP enviado con éxito: ${info.messageId}`);
        } catch (error) {
            this.logger.error('Error al enviar correo mediante Gmail SMTP:', error);
            throw new Error(`Fallo SMTP de Gmail: ${error.message || 'No se pudo enviar el correo.'}`);
        }
    }
}