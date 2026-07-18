import { Controller, Get } from '@nestjs/common';
import { QuranService } from './quran.service';

@Controller('quran')
export class QuranController {
  constructor(private readonly quran: QuranService) {}

  @Get('surahs')
  getSurahs() {
    return this.quran.getSurahList();
  }
}
