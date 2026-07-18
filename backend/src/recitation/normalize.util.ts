/** Strip diacritics/annotations and unify letter variants for matching. */
export function normalizeArabic(text: string): string {
  return (
    text
      // harakat, quranic annotation signs, superscript alef, small high/low marks, tatweel
      .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ࣓-ࣿ]/g, '')
      // hamza-carrying alefs and alef wasla -> bare alef
      .replace(/[آأإٱ]/g, 'ا')
      // alef maqsura -> ya, ta marbuta -> ha
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
