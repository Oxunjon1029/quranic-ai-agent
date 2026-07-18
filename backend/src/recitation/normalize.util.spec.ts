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
  it('removes quranic annotation marks (small alef, wasla, etc.)', () => {
    expect(normalizeArabic('ٱلرَّحْمَٰنِ')).toBe('الرحمن');
  });
  it('collapses whitespace', () => {
    expect(normalizeArabic('  الحمد   لله ')).toBe('الحمد لله');
  });
});
