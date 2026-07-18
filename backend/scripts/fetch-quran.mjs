// One-time: node scripts/fetch-quran.mjs (from backend/)
import { writeFileSync } from 'fs';

const res = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
const { data } = await res.json();
const out = {};
for (const s of data.surahs) {
  out[s.number] = {
    name: s.name,
    englishName: s.englishName,
    ayahs: s.ayahs.map((a) => ({ n: a.numberInSurah, text: a.text })),
  };
}
writeFileSync(new URL('../data/quran.json', import.meta.url), JSON.stringify(out));
console.log('Wrote', Object.keys(out).length, 'surahs');
