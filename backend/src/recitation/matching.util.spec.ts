import { calculateAccuracy } from './matching.util';

describe('Recitation Matching Utility', () => {
  it('should return 100 accuracy for identical strings', () => {
    expect(calculateAccuracy('بسم الله الرحمن الرحيم', 'بسم الله الرحمن الرحيم')).toBe(100);
  });

  it('should return low accuracy for completely different strings', () => {
    expect(calculateAccuracy('بسم الله الرحمن الرحيم', 'الحمد لله رب العالمين')).toBeLessThan(50);
  });

  it('should handle minor mistakes gracefully', () => {
    const result = calculateAccuracy('بسم الله الرحمن الرحيم', 'بسم الله لرحمن الرحيم');
    expect(result).toBeGreaterThan(80);
    expect(result).toBeLessThan(100);
  });

  it('should handle empty strings', () => {
    expect(calculateAccuracy('', '')).toBe(100);
    expect(calculateAccuracy('بسم', '')).toBe(0);
  });

  it('should ignore leading and trailing spaces', () => {
    expect(calculateAccuracy('بسم الله ', ' بسم الله')).toBe(100);
  });
});
