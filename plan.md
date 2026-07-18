# Live Recitation Correction (Web v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The imam selects a surah, recites into the mic, and the app follows word-by-word in real time — highlighting mistakes (wrong/skipped/added words, getting stuck) and playing the correct words in a qari's voice.

**Architecture:** Browser captures PCM16 audio via AudioWorklet and streams it over socket.io to the NestJS backend, which relays it to OpenAI's Realtime transcription API (`gpt-4o-transcribe`, Arabic). Transcript deltas feed a position-tracking matching engine that compares against the selected surah's normalized text and pushes corrections back over the same socket. Quran text is bundled JSON (Uthmani + normalized); sessions/mistakes persist via Prisma + SQLite.

**Tech Stack:** NestJS 10, socket.io (`@nestjs/websockets` + `@nestjs/platform-socket.io`), `ws` (OpenAI relay), Prisma + SQLite, React 18 + Vite + Tailwind + zustand, everyayah.com qari mp3s.

**Spec:** `docs/superpowers/specs/2026-07-18-live-recitation-correction-design.md`

## Global Constraints

- Backend env: `OPENAI_API_KEY` and `DATABASE_URL="file:./dev.db"` in `backend/.env` (never committed).
- Audio format end-to-end: PCM16, 24kHz, mono.
- All Arabic text matching uses normalized text (diacritics stripped); display always uses Uthmani text.
- No auth in v1. Ayah numbering is 1-based; word `globalIndex` is 0-based across the selected range.
- Run backend tests with `yarn --cwd backend jest`; dev servers: `yarn --cwd backend start:dev`, `yarn --cwd frontend dev`.

---

### Task 1: Arabic normalization utility

**Files:**
- Create: `backend/src/recitation/normalize.util.ts`
- Test: `backend/src/recitation/normalize.util.spec.ts`

**Interfaces:**
- Produces: `normalizeArabic(text: string): string` — strips diacritics/tatweel, unifies letter variants.

- [ ] **Step 1: Write failing tests**

```ts
// backend/src/recitation/normalize.util.spec.ts
import { normalizeArabic } from './normalize.util';

describe('normalizeArabic', () => {
  it('strips harakat and tatweel', () => {
    expect(normalizeArabic('بِسْمِ اللَّهِ')).toBe('بسم الله');
  });
  it('normalizes alef variants to bare alef', () => {
    expect(normalizeArabic('أَإِآا')).toBe('اااا');
  });
  it('normalizes alef maqsura to ya and ta marbuta to ha', () => {
    expect(normalizeArabic('مُوسَىٰ رَحْمَة')).toBe('موسي رحمه');
  });
  it('removes quranic annotation marks (small alef, sajdah, etc.)', () => {
    expect(normalizeArabic('ٱلرَّحْمَٰنِ')).toBe('الرحمن');
  });
  it('collapses whitespace', () => {
    expect(normalizeArabic('  الحمد   لله ')).toBe('الحمد لله');
  });
});
```

- [ ] **Step 2: Run** `yarn --cwd backend jest normalize` — expect FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// backend/src/recitation/normalize.util.ts
/** Strip diacritics/annotations and unify letter variants for matching. */
export function normalizeArabic(text: string): string {
  return text
    // harakat, quranic annotation signs, superscript alef, tatweel
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـࣰ۟-ࣿ]/g, '')
    // hamza-carrying alefs and wasla -> bare alef
    .replace(/[آأإٱ]/g, 'ا')
    // alef maqsura -> ya, ta marbuta -> ha
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}
```

- [ ] **Step 4: Run** `yarn --cwd backend jest normalize` — expect PASS (adjust regex until all 5 pass; the Uthmani script uses many annotation codepoints).

- [ ] **Step 5: Commit** `git add backend/src/recitation/normalize.util.* && git commit -m "feat: arabic normalization for recitation matching"`

---

### Task 2: Quran data bundle + QuranService

**Files:**
- Create: `backend/scripts/fetch-quran.mjs`, `backend/data/quran.json` (generated, committed), `backend/src/quran/quran.service.ts`, `backend/src/quran/quran.module.ts`
- Test: `backend/src/quran/quran.service.spec.ts`

**Interfaces:**
- Consumes: `normalizeArabic` (Task 1).
- Produces:
  ```ts
  interface QuranWord { display: string; norm: string; ayah: number; wordInAyah: number; globalIndex: number; }
  class QuranService {
    getSurahList(): { number: number; name: string; ayahCount: number }[];
    getWords(surah: number, startAyah: number, endAyah?: number): QuranWord[];
    getAyahText(surah: number, ayah: number): string; // Uthmani display text
  }
  ```

- [ ] **Step 1: Write fetch script**

```js
// backend/scripts/fetch-quran.mjs — run once: node backend/scripts/fetch-quran.mjs
import { writeFileSync } from 'fs';
const res = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
const { data } = await res.json();
const out = {};
for (const s of data.surahs) {
  out[s.number] = {
    name: s.name,
    englishName: s.englishName,
    ayahs: s.ayahs.map(a => ({ n: a.numberInSurah, text: a.text })),
  };
}
writeFileSync(new URL('../data/quran.json', import.meta.url), JSON.stringify(out));
console.log('Wrote', Object.keys(out).length, 'surahs');
```

- [ ] **Step 2: Run it** — `node backend/scripts/fetch-quran.mjs`, expect "Wrote 114 surahs". Verify `backend/data/quran.json` is ~1-2MB and surah 1 has 7 ayahs.

- [ ] **Step 3: Write failing service tests**

```ts
// backend/src/quran/quran.service.spec.ts
import { QuranService } from './quran.service';

describe('QuranService', () => {
  const svc = new QuranService();
  it('lists 114 surahs', () => {
    expect(svc.getSurahList()).toHaveLength(114);
    expect(svc.getSurahList()[0]).toMatchObject({ number: 1, ayahCount: 7 });
  });
  it('returns words with normalized text and global indices', () => {
    const words = svc.getWords(1, 1); // Al-Fatiha from ayah 1
    expect(words[0].norm).toBe('بسم');
    expect(words[0]).toMatchObject({ ayah: 1, wordInAyah: 0, globalIndex: 0 });
    expect(words.at(-1)!.ayah).toBe(7);
  });
  it('respects startAyah', () => {
    expect(svc.getWords(1, 2)[0].ayah).toBe(2);
    expect(svc.getWords(1, 2)[0].globalIndex).toBe(0);
  });
});
```

- [ ] **Step 4: Run** `yarn --cwd backend jest quran` — expect FAIL.

- [ ] **Step 5: Implement service + module**

```ts
// backend/src/quran/quran.service.ts
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeArabic } from '../recitation/normalize.util';

export interface QuranWord {
  display: string; norm: string; ayah: number; wordInAyah: number; globalIndex: number;
}

type QuranData = Record<string, { name: string; englishName: string; ayahs: { n: number; text: string }[] }>;

@Injectable()
export class QuranService {
  private data: QuranData = JSON.parse(
    readFileSync(join(__dirname, '..', '..', 'data', 'quran.json'), 'utf8'),
  );

  getSurahList() {
    return Object.entries(this.data).map(([num, s]) => ({
      number: Number(num), name: s.name, englishName: s.englishName, ayahCount: s.ayahs.length,
    }));
  }

  getAyahText(surah: number, ayah: number): string {
    return this.data[surah].ayahs.find(a => a.n === ayah)!.text;
  }

  getWords(surah: number, startAyah: number, endAyah?: number): QuranWord[] {
    const words: QuranWord[] = [];
    let globalIndex = 0;
    for (const a of this.data[surah].ayahs) {
      if (a.n < startAyah || (endAyah && a.n > endAyah)) continue;
      a.text.split(/\s+/).forEach((w, i) => {
        const norm = normalizeArabic(w);
        if (!norm) return; // skip pure annotation marks (e.g. sajdah symbol)
        words.push({ display: w, norm, ayah: a.n, wordInAyah: i, globalIndex: globalIndex++ });
      });
    }
    return words;
  }
}
```

```ts
// backend/src/quran/quran.module.ts
import { Module } from '@nestjs/common';
import { QuranService } from './quran.service';

@Module({ providers: [QuranService], exports: [QuranService] })
export class QuranModule {}
```

Note: `nest build` copies only TS — the service reads `backend/data/quran.json` relative to `dist`, so use `process.cwd()` fallback if the join above fails at dev-time vs prod. Simplest robust path: `join(process.cwd(), 'data', 'quran.json')` (backend is always run from `backend/`). Use that.

- [ ] **Step 6: Run** `yarn --cwd backend jest quran` — expect PASS. Register `QuranModule` in `backend/src/app.module.ts` imports.

- [ ] **Step 7: Commit** `git add backend/scripts backend/data/quran.json backend/src/quran backend/src/app.module.ts && git commit -m "feat: bundled quran text + QuranService"`

---

### Task 3: Position tracker (matching engine)

**Files:**
- Create: `backend/src/recitation/position-tracker.ts`
- Test: `backend/src/recitation/position-tracker.spec.ts`

**Interfaces:**
- Consumes: `QuranWord` (Task 2), `calculateAccuracy` from existing `matching.util.ts`.
- Produces:
  ```ts
  type TrackerEvent =
    | { kind: 'advance'; globalIndex: number }                                  // word recited correctly
    | { kind: 'wrong-word'; globalIndex: number; actual: string }               // attempted but wrong
    | { kind: 'skipped'; fromIndex: number; toIndex: number }                   // words fromIndex..toIndex-1 skipped
    | { kind: 'added'; actual: string; atIndex: number };                       // extra word, position unchanged
  class PositionTracker {
    constructor(words: QuranWord[]);
    readonly pos: number;                       // next expected globalIndex
    readonly done: boolean;
    consume(transcript: string): TrackerEvent[]; // feed raw ASR text (any chunk size)
    peekNext(count: number): QuranWord[];        // upcoming words (for stuck prompts)
  }
  ```
- Matching rules: a transcript word matches an expected word when `calculateAccuracy(norm(expected), norm(actual)) >= 75`. Lookahead window for skip detection: 3 words. If it matches none of pos..pos+3 but similarity to `pos` is >= 40 → `wrong-word` (advance). Below 40 → `added` (no advance).

- [ ] **Step 1: Write failing tests**

```ts
// backend/src/recitation/position-tracker.spec.ts
import { PositionTracker } from './position-tracker';
import { QuranService } from '../quran/quran.service';

const words = new QuranService().getWords(1, 1); // Al-Fatiha

const mk = () => new PositionTracker(words);

describe('PositionTracker', () => {
  it('advances through correct recitation', () => {
    const t = mk();
    const events = t.consume('بسم الله الرحمن الرحيم');
    expect(events.every(e => e.kind === 'advance')).toBe(true);
    expect(t.pos).toBe(4);
  });

  it('detects a wrong word and advances past it', () => {
    const t = mk();
    t.consume('بسم الله');
    const events = t.consume('الرحيم'); // said الرحيم where الرحمن expected — similar enough = wrong-word
    expect(events[0].kind).toBe('wrong-word');
    expect(t.pos).toBe(3);
  });

  it('detects skipped words via lookahead', () => {
    const t = mk();
    const events = t.consume('بسم الرحمن'); // skipped الله
    expect(events).toContainEqual({ kind: 'skipped', fromIndex: 1, toIndex: 2 });
    expect(t.pos).toBe(3);
  });

  it('flags an unrelated extra word without advancing', () => {
    const t = mk();
    t.consume('بسم الله');
    const events = t.consume('سبحان'); // unrelated word
    expect(events[0].kind).toBe('added');
    expect(t.pos).toBe(2);
  });

  it('handles incremental chunks and completes', () => {
    const t = mk();
    for (const w of words) t.consume(w.display);
    expect(t.done).toBe(true);
  });
});
```

- [ ] **Step 2: Run** `yarn --cwd backend jest position-tracker` — expect FAIL.

- [ ] **Step 3: Implement**

```ts
// backend/src/recitation/position-tracker.ts
import { calculateAccuracy } from './matching.util';
import { normalizeArabic } from './normalize.util';
import { QuranWord } from '../quran/quran.service';

export type TrackerEvent =
  | { kind: 'advance'; globalIndex: number }
  | { kind: 'wrong-word'; globalIndex: number; actual: string }
  | { kind: 'skipped'; fromIndex: number; toIndex: number }
  | { kind: 'added'; actual: string; atIndex: number };

const MATCH = 75;      // similarity to count as the same word
const ATTEMPT = 40;    // similarity to count as an attempt at the expected word
const LOOKAHEAD = 3;

export class PositionTracker {
  private _pos = 0;
  constructor(private readonly words: QuranWord[]) {}

  get pos() { return this._pos; }
  get done() { return this._pos >= this.words.length; }

  peekNext(count: number): QuranWord[] {
    return this.words.slice(this._pos, this._pos + count);
  }

  consume(transcript: string): TrackerEvent[] {
    const events: TrackerEvent[] = [];
    const incoming = normalizeArabic(transcript).split(' ').filter(Boolean);

    for (const actual of incoming) {
      if (this.done) break;
      const sim = (i: number) => calculateAccuracy(this.words[i].norm, actual);

      if (sim(this._pos) >= MATCH) {
        events.push({ kind: 'advance', globalIndex: this._pos++ });
        continue;
      }
      // lookahead: did the reciter skip ahead?
      let jumped = false;
      for (let k = 1; k <= LOOKAHEAD && this._pos + k < this.words.length; k++) {
        if (sim(this._pos + k) >= MATCH) {
          events.push({ kind: 'skipped', fromIndex: this._pos, toIndex: this._pos + k });
          this._pos += k;
          events.push({ kind: 'advance', globalIndex: this._pos++ });
          jumped = true;
          break;
        }
      }
      if (jumped) continue;

      if (sim(this._pos) >= ATTEMPT) {
        events.push({ kind: 'wrong-word', globalIndex: this._pos++, actual });
      } else {
        events.push({ kind: 'added', actual, atIndex: this._pos });
      }
    }
    return events;
  }
}
```

- [ ] **Step 4: Run** `yarn --cwd backend jest position-tracker` — expect PASS. If the الرحمن/الرحيم test trips the wrong branch, tune thresholds (these two normalize to الرحمن/الرحيم — similarity ~66%, so it must land in the wrong-word band; verify MATCH stays above it).

- [ ] **Step 5: Commit** `git add backend/src/recitation/position-tracker.* && git commit -m "feat: position tracker with wrong/skip/added detection"`

---

### Task 4: Prisma persistence (Session + Mistake)

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/src/db/prisma.service.ts`, `backend/src/db/db.module.ts`
- Test: none (schema/glue only; verified by migration + Task 5 usage)

**Interfaces:**
- Produces: `PrismaService extends PrismaClient` (standard Nest pattern), models below.

- [ ] **Step 1: Install** `yarn --cwd backend add @prisma/client && yarn --cwd backend add -D prisma`

- [ ] **Step 2: Update schema** — make `Session` standalone for web v1 and add `Mistake`:

```prisma
model Session {
  id         String    @id @default(uuid())
  userId     String?
  user       User?     @relation(fields: [userId], references: [id])
  surah      Int       @default(1)
  startAyah  Int       @default(1)
  startedAt  DateTime  @default(now())
  endedAt    DateTime?
  status     String    @default("ACTIVE")
  wordsTotal Int       @default(0)
  wordsRead  Int       @default(0)
  recitations RecitationLog[]
  mistakes    Mistake[]
}

model Mistake {
  id        String  @id @default(uuid())
  sessionId String
  session   Session @relation(fields: [sessionId], references: [id])
  type      String  // wrong-word | skipped | added | stuck
  ayah      Int
  wordIndex Int     // globalIndex in session range
  expected  String
  actual    String?
  createdAt DateTime @default(now())
}
```

- [ ] **Step 3: Migrate** — add `DATABASE_URL="file:./dev.db"` to `backend/.env`, add `.env` and `*.db` to `.gitignore`, then `yarn --cwd backend prisma migrate dev --name live-sessions`. Expect: migration applied, client generated.

- [ ] **Step 4: PrismaService + module**

```ts
// backend/src/db/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() { await this.$connect(); }
}
```

```ts
// backend/src/db/db.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({ providers: [PrismaService], exports: [PrismaService] })
export class DbModule {}
```

- [ ] **Step 5: Verify** `yarn --cwd backend build` passes. **Commit** (schema, migration, src/db, .gitignore): `git commit -m "feat: session + mistake persistence"`

---

### Task 5: OpenAI Realtime relay + Recitation WebSocket gateway

**Files:**
- Create: `backend/src/recitation/openai-transcriber.ts`, `backend/src/recitation/recitation.gateway.ts`
- Modify: `backend/src/recitation/recitation.module.ts`, `backend/src/main.ts` (enable CORS)
- Test: `backend/src/recitation/recitation.gateway.spec.ts` (session logic with mocked transcriber)

**Interfaces:**
- Consumes: `PositionTracker`, `QuranService`, `PrismaService`.
- Produces socket.io contract (namespace `/recite`):
  - Client→server: `session:start {surah:number, startAyah:number}` → ack `{sessionId, words:{display,ayah,globalIndex}[]}`; `audio` (ArrayBuffer, PCM16 24kHz mono); `session:stop` → ack summary.
  - Server→client: `transcript {text}`; `events {events: TrackerEvent[], pos:number}`; `correction {type:'wrong-word'|'skipped'|'added'|'stuck', ayah:number, wordIndex:number, expectedWords:string[], audioUrl:string}`; `error {message}`.
  - `audioUrl` = `https://everyayah.com/data/Alafasy_128kbps/SSSAAA.mp3` (surah & ayah zero-padded to 3 digits).
- Transcriber contract:
  ```ts
  class OpenAiTranscriber {
    constructor(onDelta: (text: string) => void, onError: (err: Error) => void);
    start(): Promise<void>;          // opens WS to OpenAI, configures session
    sendAudio(chunk: Buffer): void;  // base64 append
    stop(): void;
  }
  ```

- [ ] **Step 1: Install** `yarn --cwd backend add @nestjs/websockets @nestjs/platform-socket.io socket.io ws && yarn --cwd backend add -D @types/ws`

- [ ] **Step 2: Implement transcriber**

```ts
// backend/src/recitation/openai-transcriber.ts
import WebSocket from 'ws';

export class OpenAiTranscriber {
  private ws: WebSocket | null = null;

  constructor(
    private readonly onDelta: (text: string) => void,
    private readonly onError: (err: Error) => void,
  ) {}

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription', {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      });
      this.ws.on('open', () => {
        this.ws!.send(JSON.stringify({
          type: 'transcription_session.update',
          session: {
            input_audio_format: 'pcm16',
            input_audio_transcription: { model: 'gpt-4o-transcribe', language: 'ar' },
            turn_detection: { type: 'server_vad', silence_duration_ms: 400 },
          },
        }));
        this.attachReconnect();
        resolve();
      });
      this.ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'conversation.item.input_audio_transcription.delta' && msg.delta) {
          this.onDelta(msg.delta);
        }
        if (msg.type === 'error') this.onError(new Error(msg.error?.message ?? 'openai error'));
      });
      this.ws.on('error', (e) => { this.onError(e as Error); reject(e); });
    });
  }

  /** Reconnect once on unexpected close (spec: session continues after OpenAI WS drop). */
  private attachReconnect() {
    this.ws?.on('close', (code) => {
      if (code !== 1000 && this.ws) {
        this.ws = null;
        this.start().catch((e) => this.onError(e));
      }
    });
  }

  sendAudio(chunk: Buffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: chunk.toString('base64') }));
    }
  }

  stop() { this.ws?.close(); this.ws = null; }
}
```

- [ ] **Step 3: Write failing gateway session-logic test** — test the per-connection session handler with the transcriber mocked out. Structure the gateway so logic lives in a testable `ReciteSession` class inside `recitation.gateway.ts`:

```ts
// backend/src/recitation/recitation.gateway.spec.ts
import { ReciteSession } from './recitation.gateway';
import { QuranService } from '../quran/quran.service';

describe('ReciteSession', () => {
  it('emits correction with qari audio url on wrong word', () => {
    const emitted: any[] = [];
    const s = new ReciteSession(new QuranService(), 1, 1, (ev, data) => emitted.push([ev, data]));
    s.handleDelta('بسم الله الرحيم'); // wrong 3rd word
    const corr = emitted.find(([ev]) => ev === 'correction');
    expect(corr[1]).toMatchObject({
      type: 'wrong-word', ayah: 1,
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
    });
    expect(corr[1].expectedWords[0]).toContain('لرَّحْمَ'); // display form of الرحمن
  });

  it('emits stuck correction with next words after silence', () => {
    jest.useFakeTimers();
    const emitted: any[] = [];
    const s = new ReciteSession(new QuranService(), 1, 1, (ev, d) => emitted.push([ev, d]));
    s.handleDelta('بسم');
    jest.advanceTimersByTime(4500);
    expect(emitted.some(([ev, d]) => ev === 'correction' && d.type === 'stuck')).toBe(true);
    jest.useRealTimers();
    s.dispose();
  });
});
```

- [ ] **Step 4: Run** `yarn --cwd backend jest recitation.gateway` — expect FAIL.

- [ ] **Step 5: Implement gateway + session**

```ts
// backend/src/recitation/recitation.gateway.ts
import { WebSocketGateway, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { QuranService, QuranWord } from '../quran/quran.service';
import { PrismaService } from '../db/prisma.service';
import { PositionTracker, TrackerEvent } from './position-tracker';
import { OpenAiTranscriber } from './openai-transcriber';

const STUCK_MS = 4000;
const pad = (n: number) => String(n).padStart(3, '0');
const qariUrl = (s: number, a: number) => `https://everyayah.com/data/Alafasy_128kbps/${pad(s)}${pad(a)}.mp3`;

/** Per-connection recitation session: tracker + stuck timer. Emit-callback keeps it unit-testable. */
export class ReciteSession {
  readonly tracker: PositionTracker;
  readonly words: QuranWord[];
  mistakes: { type: string; ayah: number; wordIndex: number; expected: string; actual?: string }[] = [];
  private stuckTimer: NodeJS.Timeout;

  constructor(
    quran: QuranService,
    readonly surah: number,
    readonly startAyah: number,
    private readonly emit: (event: string, data: unknown) => void,
  ) {
    this.words = quran.getWords(surah, startAyah);
    this.tracker = new PositionTracker(this.words);
    this.stuckTimer = setInterval(() => this.checkStuck(), 1000);
    this.lastProgress = Date.now();
  }
  private lastProgress: number;
  private started = false; // don't fire stuck before first word

  handleDelta(text: string) {
    this.emit('transcript', { text });
    const events = this.tracker.consume(text);
    if (events.length) { this.lastProgress = Date.now(); this.started = true; }
    this.emit('events', { events, pos: this.tracker.pos });
    for (const e of events) this.toCorrection(e);
  }

  private toCorrection(e: TrackerEvent) {
    const at = (i: number) => this.words[Math.min(i, this.words.length - 1)];
    let payload: { type: string; ayah: number; wordIndex: number; expectedWords: string[]; actual?: string } | null = null;
    if (e.kind === 'wrong-word') {
      const w = at(e.globalIndex);
      payload = { type: 'wrong-word', ayah: w.ayah, wordIndex: e.globalIndex, expectedWords: [w.display], actual: e.actual };
    } else if (e.kind === 'skipped') {
      const w = at(e.fromIndex);
      payload = { type: 'skipped', ayah: w.ayah, wordIndex: e.fromIndex,
        expectedWords: this.words.slice(e.fromIndex, e.toIndex).map(x => x.display) };
    } else if (e.kind === 'added') {
      const w = at(e.atIndex);
      payload = { type: 'added', ayah: w.ayah, wordIndex: e.atIndex, expectedWords: [w.display], actual: e.actual };
    }
    if (payload) {
      this.mistakes.push({ type: payload.type, ayah: payload.ayah, wordIndex: payload.wordIndex,
        expected: payload.expectedWords.join(' '), actual: payload.actual });
      this.emit('correction', { ...payload, audioUrl: qariUrl(this.surah, payload.ayah) });
    }
  }

  private checkStuck() {
    if (!this.started || this.tracker.done) return;
    if (Date.now() - this.lastProgress >= STUCK_MS) {
      this.lastProgress = Date.now(); // don't re-fire every second
      const next = this.tracker.peekNext(3);
      if (!next.length) return;
      this.mistakes.push({ type: 'stuck', ayah: next[0].ayah, wordIndex: next[0].globalIndex,
        expected: next.map(w => w.display).join(' ') });
      this.emit('correction', {
        type: 'stuck', ayah: next[0].ayah, wordIndex: next[0].globalIndex,
        expectedWords: next.map(w => w.display), audioUrl: qariUrl(this.surah, next[0].ayah),
      });
    }
  }

  dispose() { clearInterval(this.stuckTimer); }
}

@WebSocketGateway({ namespace: '/recite', cors: { origin: '*' } })
export class RecitationGateway {
  private sessions = new Map<string, { session: ReciteSession; transcriber: OpenAiTranscriber; dbId: string }>();

  constructor(private readonly quran: QuranService, private readonly prisma: PrismaService) {}

  @SubscribeMessage('session:start')
  async onStart(@ConnectedSocket() client: Socket, @MessageBody() body: { surah: number; startAyah: number }) {
    this.cleanup(client.id);
    const session = new ReciteSession(this.quran, body.surah, body.startAyah ?? 1,
      (ev, data) => client.emit(ev, data));
    const transcriber = new OpenAiTranscriber(
      (delta) => session.handleDelta(delta),
      (err) => client.emit('error', { message: err.message }),
    );
    await transcriber.start();
    const db = await this.prisma.session.create({
      data: { surah: body.surah, startAyah: body.startAyah ?? 1, wordsTotal: session.words.length },
    });
    this.sessions.set(client.id, { session, transcriber, dbId: db.id });
    return { sessionId: db.id, words: session.words.map(({ display, ayah, globalIndex }) => ({ display, ayah, globalIndex })) };
  }

  @SubscribeMessage('audio')
  onAudio(@ConnectedSocket() client: Socket, @MessageBody() chunk: Buffer) {
    this.sessions.get(client.id)?.transcriber.sendAudio(Buffer.from(chunk));
  }

  @SubscribeMessage('session:stop')
  async onStop(@ConnectedSocket() client: Socket) {
    const entry = this.sessions.get(client.id);
    if (!entry) return { mistakes: [] };
    const { session, transcriber, dbId } = entry;
    transcriber.stop(); session.dispose(); this.sessions.delete(client.id);
    await this.prisma.session.update({ where: { id: dbId },
      data: { endedAt: new Date(), status: 'COMPLETED', wordsRead: session.tracker.pos } });
    if (session.mistakes.length) {
      await this.prisma.mistake.createMany({ data: session.mistakes.map(m => ({ ...m, sessionId: dbId })) });
    }
    return { mistakes: session.mistakes, wordsRead: session.tracker.pos, wordsTotal: session.words.length };
  }

  handleDisconnect(client: Socket) { this.cleanup(client.id); }
  private cleanup(id: string) {
    const e = this.sessions.get(id);
    if (e) { e.transcriber.stop(); e.session.dispose(); this.sessions.delete(id); }
  }
}
```

Update `recitation.module.ts` to provide the gateway and import `QuranModule` + `DbModule`; enable CORS in `main.ts` (`app.enableCors()`).

- [ ] **Step 6: Run** `yarn --cwd backend jest recitation.gateway` — expect PASS; `yarn --cwd backend build` — expect clean.

- [ ] **Step 7: Commit** `git commit -m "feat: realtime recitation gateway with openai transcription relay"`

---

### Task 6: Frontend — audio streaming + live session store

**Files:**
- Create: `frontend/src/lib/pcm-worklet.ts`, `frontend/src/lib/reciteSocket.ts`, `frontend/src/store/useReciteStore.ts`
- Test: manual (browser APIs); logic kept thin.

**Interfaces:**
- Consumes: socket contract from Task 5 (server at `http://localhost:3000/recite`).
- Produces:
  ```ts
  // useReciteStore state
  { surah: number|null; startAyah: number;
    words: { display: string; ayah: number; globalIndex: number; status: 'pending'|'correct'|'mistake' }[];
    pos: number; recording: boolean;
    correction: { type: string; expectedWords: string[]; audioUrl: string } | null;
    summary: { mistakes: any[]; wordsRead: number; wordsTotal: number } | null;
    transcript: string; error: string | null;
    start(surah: number, startAyah: number): Promise<void>; stop(): Promise<void>; }
  ```

- [ ] **Step 1: Install** `yarn --cwd frontend add socket.io-client`

- [ ] **Step 2: PCM capture** — AudioWorklet that downsamples mic input to 24kHz PCM16:

```ts
// frontend/src/lib/pcm-worklet.ts
const workletCode = `
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('pcm-processor', PcmProcessor);`;

export async function startPcmCapture(onChunk: (pcm16: ArrayBuffer) => void) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
  const ctx = new AudioContext({ sampleRate: 24000 });
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' })));
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'pcm-processor');
  node.port.onmessage = (e: MessageEvent<Float32Array>) => {
    const f32 = e.data;
    const i16 = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32767));
    onChunk(i16.buffer);
  };
  src.connect(node);
  return () => { node.disconnect(); src.disconnect(); stream.getTracks().forEach(t => t.stop()); ctx.close(); };
}
```

- [ ] **Step 3: Store + socket glue** — `useReciteStore` (zustand): `start()` connects `io('http://localhost:3000/recite')`, emits `session:start`, builds `words[]` from the ack with all statuses `'pending'`, starts PCM capture forwarding chunks via `socket.emit('audio', chunk)`. Socket handlers: `transcript` appends text; `events` — for each event mark `advance→correct`, `wrong-word/skipped→mistake` on affected indices and set `pos`; `correction` sets `correction` (auto-clear after 5s); `error` sets `error`. `stop()` emits `session:stop` with ack → `summary`, stops capture, disconnects. Use `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'` for the base URL.

- [ ] **Step 4: Verify** `yarn --cwd frontend build` passes (type-checks the store). **Commit** `git commit -m "feat: frontend audio streaming + recite session store"`

---

### Task 7: Frontend — live Quran view, correction banner, summary

**Files:**
- Create: `frontend/src/components/LiveQuranView.tsx`, `frontend/src/components/CorrectionBanner.tsx`, `frontend/src/components/SessionSummary.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/components/SurahSelector.tsx` (fetch surah list from backend `GET /quran/surahs` — add that tiny controller to `QuranModule`, returning `getSurahList()`)

**Interfaces:**
- Consumes: `useReciteStore` (Task 6).
- Produces: UI flow — select surah → live view (record button, Quran text with word states, transcript strip, correction banner with qari audio) → summary.

- [ ] **Step 1: LiveQuranView** — renders `words` RTL (`dir="rtl"`, an Arabic font, `text-2xl leading-loose`), each word a `<span>`: pending = muted; correct = green; mistake = red underline; the word at `pos` gets a pulsing ring. Auto-scroll current word into view (`ref.scrollIntoView({block:'center', behavior:'smooth'})` when `pos` changes).

- [ ] **Step 2: CorrectionBanner** — when `correction` set: slide-in banner showing type label (Arabic/English: "Wrong word", "Skipped", "Stuck — next words:"), the `expectedWords` big and bold, and an `<audio autoPlay src={correction.audioUrl}>` playing the qari's ayah. Mistake audio failures: `onError` hides the audio element (visual-only fallback).

- [ ] **Step 3: SessionSummary** — after `stop()`: accuracy = `wordsRead/wordsTotal`, mistake list grouped by ayah with type, expected vs actual, and a replay button per ayah (same everyayah URL). "New session" button → reset store.

- [ ] **Step 4: Rewire App.tsx** — replace the per-ayah record/check flow with: `SurahSelector` (surah + start ayah) → live screen (`LiveQuranView` + mic toggle from store + `CorrectionBanner`) → `SessionSummary` when summary present. Keep the existing visual style (Tailwind classes, decorative background). Remove now-unused per-ayah advance logic from the store or leave `useSalahStore` untouched and just stop using it in App.

- [ ] **Step 5: Verify** `yarn --cwd frontend build` passes. **Commit** `git commit -m "feat: live recitation UI with corrections and summary"`

---

### Task 8: End-to-end verification

**Files:** none (verification)

- [ ] **Step 1:** `backend/.env` has real `OPENAI_API_KEY`. Start both: `yarn --cwd backend start:dev` and `yarn --cwd frontend dev`.
- [ ] **Step 2:** Open the Vite URL in Chrome. Select Al-Fatiha, start ayah 1, tap record, recite correctly → words turn green in near-real-time, no corrections fire.
- [ ] **Step 3:** Recite with a deliberate wrong word and a skipped word → red highlight + banner + qari audio within ~1-2s of the mistake.
- [ ] **Step 4:** Go silent mid-ayah for 5s → "stuck" prompt appears with the next words and audio.
- [ ] **Step 5:** Stop → summary lists exactly the mistakes made; verify a `Session` + `Mistake` rows exist (`yarn --cwd backend prisma studio`).
- [ ] **Step 6:** Fix anything found, run full backend suite `yarn --cwd backend jest` → all green. Final commit.

---

## Later phases (not in this plan)
Tajweed/pronunciation analysis · passage auto-detect · Telegram bot (reuse gateway pipeline) · iOS/Android · auth/multi-user · Postgres swap.
