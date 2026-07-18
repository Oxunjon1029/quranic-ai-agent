import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf;
  private readonly logger = new Logger(BotService.name);

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || 'DUMMY_TOKEN');
  }

  onModuleInit() {
    this.bot.start((ctx) => {
      ctx.reply('Welcome to the Quranic AI Agent! Open the Mini App to start your Salah session.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Open Mini App', web_app: { url: process.env.FRONTEND_URL || 'http://localhost:5173' } }]
          ]
        }
      });
    });

    this.bot.help((ctx) => ctx.reply('Use /start to launch the Mini App for Salah guidance.'));

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token === 'DUMMY_TOKEN') {
      this.logger.warn('Telegram bot not launched: No valid TELEGRAM_BOT_TOKEN set in .env');
      return;
    }

    this.bot.launch().catch(err => this.logger.error('Telegram bot failed to start:', err));
  }
}
