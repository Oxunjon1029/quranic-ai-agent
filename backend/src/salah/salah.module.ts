import { Module } from '@nestjs/common';
import { SalahFlowService } from './salah.service';

@Module({
  providers: [SalahFlowService],
  exports: [SalahFlowService],
})
export class SalahModule {}
