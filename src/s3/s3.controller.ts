import {
    Controller,
    Post,
    Body,
    UseGuards,
} from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('s3')
@UseGuards(JwtAuthGuard)
export class S3Controller {
    constructor(private readonly s3Service: S3Service,) { }
    @Post('presigned-url')
    async getPresignedUrl(@Body() body: { fileType: string }) {
        return this.s3Service.generatePresignedUrl(body.fileType);
    }

    @Post('image')
    async deleteS3Object(@Body() body: { key: string }) {
        return this.s3Service.deleteFile(body.key);
    }
}