import { Module } from '@nestjs/common';
import { RecitationService } from './recitation.service';
import { RecitationGateway } from './recitation.gateway';
import { QuranModule } from '../quran/quran.module';
import { DbModule } from '../db/db.module';

@Module({
  imports: [QuranModule, DbModule],
  providers: [RecitationService, RecitationGateway],
  exports: [RecitationService],
})
export class RecitationModule {}
