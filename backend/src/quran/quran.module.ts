import { Module } from '@nestjs/common';
import { QuranService } from './quran.service';

@Module({ providers: [QuranService], exports: [QuranService] })
export class QuranModule {}
