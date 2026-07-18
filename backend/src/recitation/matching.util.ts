export interface WordResult {
  word: string;
  expected: string;
  status: 'correct' | 'incorrect' | 'missing' | 'extra';
}

export function calculateAccuracy(expected: string, actual: string): number {
  const e = expected.trim();
  const a = actual.trim();

  if (e.length === 0) return a.length === 0 ? 100 : 0;

  const matrix = Array.from({ length: e.length + 1 }, () => new Array(a.length + 1).fill(0));
  for (let i = 0; i <= e.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= e.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = e[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[e.length][a.length];
  const maxLen = Math.max(e.length, a.length);
  return Math.max(0, (1 - distance / maxLen) * 100);
}

/**
 * Compare words between expected and actual text.
 * Returns per-word status: correct, incorrect, missing, or extra.
 */
export function compareWords(expected: string, actual: string): WordResult[] {
  const expectedWords = expected.trim().split(/\s+/).filter(w => w.length > 0);
  const actualWords = actual.trim().split(/\s+/).filter(w => w.length > 0);
  const results: WordResult[] = [];

  const maxLen = Math.max(expectedWords.length, actualWords.length);

  for (let i = 0; i < maxLen; i++) {
    const exp = expectedWords[i];
    const act = actualWords[i];

    if (exp && act) {
      // Both exist — compare them
      const wordAccuracy = calculateAccuracy(exp, act);
      results.push({
        word: act,
        expected: exp,
        status: wordAccuracy >= 75 ? 'correct' : 'incorrect',
      });
    } else if (exp && !act) {
      // Expected word is missing from recitation
      results.push({
        word: '',
        expected: exp,
        status: 'missing',
      });
    } else if (!exp && act) {
      // Extra word in recitation
      results.push({
        word: act,
        expected: '',
        status: 'extra',
      });
    }
  }

  return results;
}
