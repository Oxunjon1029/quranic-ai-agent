import { ReciteSession } from './recitation.gateway';
import { QuranService } from '../quran/quran.service';
import { normalizeArabic } from './normalize.util';

describe('ReciteSession', () => {
  it('emits correction with qari audio url on wrong word', () => {
    const emitted: [string, any][] = [];
    const s = new ReciteSession(new QuranService(), 1, 1, (ev, data) => emitted.push([ev, data]));
    s.handleDelta('بسم الله الرحيم'); // wrong 3rd word
    const corr = emitted.find(([ev]) => ev === 'correction')!;
    expect(corr[1]).toMatchObject({
      type: 'wrong-word',
      ayah: 1,
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
    });
    expect(normalizeArabic(corr[1].expectedWords[0])).toBe('الرحمن');
    s.dispose();
  });

  it('emits stuck correction with next words after silence', () => {
    jest.useFakeTimers();
    const emitted: [string, any][] = [];
    const s = new ReciteSession(new QuranService(), 1, 1, (ev, d) => emitted.push([ev, d]));
    s.handleDelta('بسم');
    jest.advanceTimersByTime(4500);
    expect(emitted.some(([ev, d]) => ev === 'correction' && d.type === 'stuck')).toBe(true);
    s.dispose(); // clear interval while fake timers still active
    jest.useRealTimers();
  });

  it('records mistakes for the summary', () => {
    const s = new ReciteSession(new QuranService(), 1, 1, () => undefined);
    s.handleDelta('بسم الرحمن'); // skipped الله
    expect(s.mistakes).toHaveLength(1);
    expect(s.mistakes[0].type).toBe('skipped');
    s.dispose();
  });
});
