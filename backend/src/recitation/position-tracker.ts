import { calculateAccuracy } from './matching.util';
import { normalizeArabic } from './normalize.util';
import { QuranWord } from '../quran/quran.service';

export type TrackerEvent =
  | { kind: 'advance'; globalIndex: number }
  | { kind: 'wrong-word'; globalIndex: number; actual: string }
  | { kind: 'skipped'; fromIndex: number; toIndex: number }
  | { kind: 'added'; actual: string; atIndex: number };

const MATCH = 75; // similarity to count as the same word
const ATTEMPT = 40; // similarity to count as an attempt at the expected word
const LOOKAHEAD = 3;

export class PositionTracker {
  private _pos = 0;

  constructor(private readonly words: QuranWord[]) {}

  get pos() {
    return this._pos;
  }

  get done() {
    return this._pos >= this.words.length;
  }

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
      // close-but-wrong beats skip detection: a near-miss at the current word
      // (e.g. الرحيم for الرحمن) is a wrong word, not a jump ahead
      if (sim(this._pos) >= ATTEMPT) {
        events.push({ kind: 'wrong-word', globalIndex: this._pos++, actual });
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

      events.push({ kind: 'added', actual, atIndex: this._pos });
    }
    return events;
  }
}
