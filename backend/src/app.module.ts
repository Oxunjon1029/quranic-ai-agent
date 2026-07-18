import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { SpeechModule } from './speech/speech.module';
import { SalahModule } from './salah/salah.module';
import { QuranModule } from './quran/quran.module';
import { RecitationModule } from './recitation/recitation.module';

@Module({
  imports: [BotModule, SpeechModule, SalahModule, QuranModule, RecitationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
