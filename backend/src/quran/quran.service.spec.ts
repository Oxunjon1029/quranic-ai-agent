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
