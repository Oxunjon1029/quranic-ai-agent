// import { describe, it } from 'node:test';
// import { calculateAccuracy } from './matching.util';

// describe('Recitation Matching Utility', () => {
//   it('should return 100 accuracy for identical strings', () => {
//     const expected = 'بسم الله الرحمن الرحيم';
//     const actual = 'بسم الله الرحمن الرحيم';
//     expect(calculateAccuracy(expected, actual)).toBe(100);
//   });

//   it('should return 0 accuracy for completely different strings', () => {
//     const expected = 'بسم الله الرحمن الرحيم';
//     const actual = 'الحمد لله رب العالمين';
//     const result = calculateAccuracy(expected, actual);
//     expect(result).toBeLessThan(20); // Very low similarity
//   });

//   it('should handle minor mistakes gracefully', () => {
//     const expected = 'بسم الله الرحمن الرحيم';
//     const actual = 'بسم الله لرحمن الرحيم'; // Missing 'ا'
//     const result = calculateAccuracy(expected, actual);
//     expect(result).toBeGreaterThan(80);
//     expect(result).toBeLessThan(100);
//   });

//   it('should handle empty strings', () => {
//     expect(calculateAccuracy('', '')).toBe(100);
//     expect(calculateAccuracy('بسم', '')).toBe(0);
//   });
  
//   it('should ignore leading and trailing spaces', () => {
//     const expected = 'بسم الله ';
//     const actual = ' بسم الله';
//     expect(calculateAccuracy(expected, actual)).toBe(100);
//   });
// });
