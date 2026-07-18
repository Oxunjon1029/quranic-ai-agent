import { PositionTracker } from './position-tracker';
import { QuranService } from '../quran/quran.service';

const words = new QuranService().getWords(1, 1); // Al-Fatiha
const mk = () => new PositionTracker(words);

describe('PositionTracker', () => {
  it('advances through correct recitation', () => {
    const t = mk();
    const events = t.consume('بسم الله الرحمن الرحيم');
    expect(events.every((e) => e.kind === 'advance')).toBe(true);
    expect(t.pos).toBe(4);
  });

  it('detects a wrong word and advances past it', () => {
    const t = mk();
    t.consume('بسم الله');
    const events = t.consume('الرحيم'); // said الرحيم where الرحمن expected
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

  it('peekNext returns upcoming words', () => {
    const t = mk();
    t.consume('بسم');
    expect(t.peekNext(2).map((w) => w.norm)).toEqual(['الله', 'الرحمن']);
  });
});
