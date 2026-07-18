import { Controller, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecitationService } from '../recitation/recitation.service';

@Controller('speech')
export class SpeechController {
  constructor(private readonly recitationService: RecitationService) {}

  @Post('check')
  @UseInterceptors(FileInterceptor('audio'))
  async checkRecitation(
    @UploadedFile() file: any,
    @Body('expectedText') expectedText: string
  ) {
    if (!file) {
      return { error: 'No audio file provided' };
    }

    const result = await this.recitationService.processRecitation(
      file.buffer,
      expectedText || 'بسم الله الرحمن الرحيم'
    );
    return result;
  }
}
