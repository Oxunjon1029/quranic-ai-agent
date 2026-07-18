import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { SpeechModule } from './speech/speech.module';
import { SalahModule } from './salah/salah.module';

@Module({
  imports: [BotModule, SpeechModule, SalahModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
