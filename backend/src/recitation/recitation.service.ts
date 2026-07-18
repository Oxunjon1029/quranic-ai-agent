import { Injectable, Logger } from '@nestjs/common';
import { calculateAccuracy, compareWords } from './matching.util';

@Injectable()
export class RecitationService {
  private readonly logger = new Logger(RecitationService.name);

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey || openaiApiKey === 'DUMMY_KEY') {
      this.logger.warn('OPENAI_API_KEY not set. Returning mock transcription for demo.');
      return 'بسم الله الرحمن الرحيم';
    }

    try {
      const formData = new FormData();
      // @ts-ignore — Blob constructor with Buffer works in Node 18+
      const blob = new Blob([audioBuffer], { type: 'audio/webm' });
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ar');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`OpenAI API error: ${response.status} ${errText}`);
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.text;
    } catch (error) {
      this.logger.error('Transcription failed, falling back to mock:', error);
      return 'بسم الله الرحمن الرحيم';
    }
  }

  async processRecitation(audioBuffer: Buffer, expectedText: string) {
    const transcribedText = await this.transcribeAudio(audioBuffer);
    const accuracy = calculateAccuracy(expectedText, transcribedText);
    const wordComparison = compareWords(expectedText, transcribedText);

    return {
      transcribedText,
      expectedText,
      accuracy,
      passed: accuracy >= 80,
      words: wordComparison,
    };
  }
}
