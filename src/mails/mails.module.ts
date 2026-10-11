import { Module } from '@nestjs/common';
import { MailsService } from './mails.service';

@Module({
    imports: [],
    providers: [MailsService],
    exports: [MailsService]
})
export class MailsModule { }