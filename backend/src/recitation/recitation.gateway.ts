import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { QuranService, QuranWord } from '../quran/quran.service';
import { PrismaService } from '../db/prisma.service';
import { PositionTracker, TrackerEvent } from './position-tracker';
import { OpenAiTranscriber } from './openai-transcriber';

const STUCK_MS = 4000;
const pad = (n: number) => String(n).padStart(3, '0');
const qariUrl = (s: number, a: number) =>
  `https://everyayah.com/data/Alafasy_128kbps/${pad(s)}${pad(a)}.mp3`;

export interface MistakeRecord {
  type: string;
  ayah: number;
  wordIndex: number;
  expected: string;
  actual?: string;
}

/** Per-connection recitation session: tracker + stuck timer. Emit-callback keeps it unit-testable. */
export class ReciteSession {
  readonly tracker: PositionTracker;
  readonly words: QuranWord[];
  mistakes: MistakeRecord[] = [];
  private stuckTimer: NodeJS.Timeout;
  private lastProgress = Date.now();
  private started = false; // don't fire stuck before the first recited word

  constructor(
    quran: QuranService,
    readonly surah: number,
    readonly startAyah: number,
    private readonly emit: (event: string, data: unknown) => void,
  ) {
    this.words = quran.getWords(surah, startAyah);
    this.tracker = new PositionTracker(this.words);
    this.stuckTimer = setInterval(() => this.checkStuck(), 1000);
  }

  handleDelta(text: string) {
    this.emit('transcript', { text });
    const events = this.tracker.consume(text);
    if (events.length) {
      this.lastProgress = Date.now();
      this.started = true;
    }
    this.emit('events', { events, pos: this.tracker.pos });
    for (const e of events) this.toCorrection(e);
  }

  private toCorrection(e: TrackerEvent) {
    const at = (i: number) => this.words[Math.min(i, this.words.length - 1)];
    let payload:
      | { type: string; ayah: number; wordIndex: number; expectedWords: string[]; actual?: string }
      | null = null;
    if (e.kind === 'wrong-word') {
      const w = at(e.globalIndex);
      payload = {
        type: 'wrong-word',
        ayah: w.ayah,
        wordIndex: e.globalIndex,
        expectedWords: [w.display],
        actual: e.actual,
      };
    } else if (e.kind === 'skipped') {
      const w = at(e.fromIndex);
      payload = {
        type: 'skipped',
        ayah: w.ayah,
        wordIndex: e.fromIndex,
        expectedWords: this.words.slice(e.fromIndex, e.toIndex).map((x) => x.display),
      };
    } else if (e.kind === 'added') {
      const w = at(e.atIndex);
      payload = {
        type: 'added',
        ayah: w.ayah,
        wordIndex: e.atIndex,
        expectedWords: [w.display],
        actual: e.actual,
      };
    }
    if (payload) {
      this.mistakes.push({
        type: payload.type,
        ayah: payload.ayah,
        wordIndex: payload.wordIndex,
        expected: payload.expectedWords.join(' '),
        actual: payload.actual,
      });
      this.emit('correction', { ...payload, audioUrl: qariUrl(this.surah, payload.ayah) });
    }
  }

  private checkStuck() {
    if (!this.started || this.tracker.done) return;
    if (Date.now() - this.lastProgress >= STUCK_MS) {
      this.lastProgress = Date.now(); // don't re-fire every second
      const next = this.tracker.peekNext(3);
      if (!next.length) return;
      this.mistakes.push({
        type: 'stuck',
        ayah: next[0].ayah,
        wordIndex: next[0].globalIndex,
        expected: next.map((w) => w.display).join(' '),
      });
      this.emit('correction', {
        type: 'stuck',
        ayah: next[0].ayah,
        wordIndex: next[0].globalIndex,
        expectedWords: next.map((w) => w.display),
        audioUrl: qariUrl(this.surah, next[0].ayah),
      });
    }
  }

  dispose() {
    clearInterval(this.stuckTimer);
  }
}

@WebSocketGateway({ namespace: '/recite', cors: { origin: '*' }, maxHttpBufferSize: 5e6 })
export class RecitationGateway implements OnGatewayDisconnect {
  private sessions = new Map<
    string,
    { session: ReciteSession; transcriber: OpenAiTranscriber; dbId: string }
  >();

  constructor(
    private readonly quran: QuranService,
    private readonly prisma: PrismaService,
  ) {}

  @SubscribeMessage('session:start')
  async onStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { surah: number; startAyah?: number },
  ) {
    this.cleanup(client.id);
    const session = new ReciteSession(this.quran, body.surah, body.startAyah ?? 1, (ev, data) =>
      client.emit(ev, data),
    );
    const transcriber = new OpenAiTranscriber(
      (delta) => session.handleDelta(delta),
      (err) => client.emit('error', { message: err.message }),
    );
    await transcriber.start();
    const db = await this.prisma.session.create({
      data: { surah: body.surah, startAyah: body.startAyah ?? 1, wordsTotal: session.words.length },
    });
    this.sessions.set(client.id, { session, transcriber, dbId: db.id });
    return {
      sessionId: db.id,
      words: session.words.map(({ display, ayah, globalIndex }) => ({ display, ayah, globalIndex })),
    };
  }

  @SubscribeMessage('audio')
  onAudio(@ConnectedSocket() client: Socket, @MessageBody() chunk: Buffer) {
    this.sessions.get(client.id)?.transcriber.sendAudio(Buffer.from(chunk));
  }

  @SubscribeMessage('session:stop')
  async onStop(@ConnectedSocket() client: Socket) {
    const entry = this.sessions.get(client.id);
    if (!entry) return { mistakes: [], wordsRead: 0, wordsTotal: 0 };
    const { session, transcriber, dbId } = entry;
    transcriber.stop();
    session.dispose();
    this.sessions.delete(client.id);
    await this.prisma.session.update({
      where: { id: dbId },
      data: { endedAt: new Date(), status: 'COMPLETED', wordsRead: session.tracker.pos },
    });
    if (session.mistakes.length) {
      await this.prisma.mistake.createMany({
        data: session.mistakes.map((m) => ({ ...m, sessionId: dbId })),
      });
    }
    return {
      mistakes: session.mistakes,
      wordsRead: session.tracker.pos,
      wordsTotal: session.words.length,
    };
  }

  handleDisconnect(client: Socket) {
    this.cleanup(client.id);
  }

  private cleanup(id: string) {
    const e = this.sessions.get(id);
    if (e) {
      e.transcriber.stop();
      e.session.dispose();
      this.sessions.delete(id);
    }
  }
}
