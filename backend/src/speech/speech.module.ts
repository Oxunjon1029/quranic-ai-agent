import { Module } from '@nestjs/common';
import { SpeechController } from './speech.controller';
import { RecitationModule } from '../recitation/recitation.module';

@Module({
  imports: [RecitationModule],
  controllers: [SpeechController]
})
export class SpeechModule {}
