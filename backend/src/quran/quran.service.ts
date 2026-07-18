import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeArabic } from '../recitation/normalize.util';

export interface QuranWord {
  display: string;
  norm: string;
  ayah: number;
  wordInAyah: number;
  globalIndex: number;
}

type QuranData = Record<
  string,
  { name: string; englishName: string; ayahs: { n: number; text: string }[] }
>;

@Injectable()
export class QuranService {
  // backend is always run from backend/ (dev, prod, jest), so cwd-relative is safe
  private data: QuranData = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'quran.json'), 'utf8'),
  );

  getSurahList() {
    return Object.entries(this.data).map(([num, s]) => ({
      number: Number(num),
      name: s.name,
      englishName: s.englishName,
      ayahCount: s.ayahs.length,
    }));
  }

  getAyahText(surah: number, ayah: number): string {
    return this.data[surah].ayahs.find((a) => a.n === ayah)!.text;
  }

  getWords(surah: number, startAyah: number, endAyah?: number): QuranWord[] {
    const words: QuranWord[] = [];
    let globalIndex = 0;
    for (const a of this.data[surah].ayahs) {
      if (a.n < startAyah || (endAyah && a.n > endAyah)) continue;
      a.text
        .split(/\s+/)
        .map((w) => ({ display: w, norm: normalizeArabic(w) }))
        // drop BOM/annotation-only tokens (e.g. sajdah symbol) so indices track real words
        .filter((w) => w.norm.length > 0)
        .forEach((w, i) => {
          words.push({ ...w, ayah: a.n, wordInAyah: i, globalIndex: globalIndex++ });
        });
    }
    return words;
  }
}
