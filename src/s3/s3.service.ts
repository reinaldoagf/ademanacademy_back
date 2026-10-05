import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class S3Service {
    private s3Client: S3Client;
    private bucketName = process.env.AWS_S3_BUCKET_NAME;

    constructor(private readonly prisma: PrismaService) {
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });
    }

    /**
     * Genera una URL firmada para subida directa desde el Frontend
     */
    async generatePresignedUrl(fileType: string, folder: string = 'uploads') {
        const fileExtension = fileType.split('/')[1] || 'jpg';
        const key = `${folder}/${uuidv4()}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: fileType,
        });

        try {
            const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 360 });
            const fileUrl = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

            return { uploadUrl, fileUrl, key };
        } catch (error) {
            throw new InternalServerErrorException('Error al generar URL de carga');
        }
    }

    /**
     * Elimina un archivo físicamente de S3
     */
    async deleteFile(key: string) {
        try {
            await this.s3Client.send(
                new DeleteObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                }),
            );
            await this.prisma.productImage.deleteMany({ where: { key } });
            await this.prisma.uniformImage.deleteMany({ where: { key } });
            await this.prisma.costumeImage.deleteMany({ where: { key } });
            await this.prisma.eventImage.deleteMany({ where: { key } });
        } catch (error) {
            console.error(`Error al eliminar objeto de S3 (${key}):`, error);
        }
    }
}