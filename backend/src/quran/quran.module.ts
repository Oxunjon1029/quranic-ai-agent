import { Module } from '@nestjs/common';
import { QuranService } from './quran.service';
import { QuranController } from './quran.controller';

@Module({ controllers: [QuranController], providers: [QuranService], exports: [QuranService] })
export class QuranModule {}
