import { Module } from '@nestjs/common';
import { RecitationService } from './recitation.service';

@Module({
  providers: [RecitationService],
  exports: [RecitationService]
})
export class RecitationModule {}
