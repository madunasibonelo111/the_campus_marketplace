// A simple test to verify our profile logic
import { expect, test } from 'vitest';

test('calculate rating average', () => {
  const ratings = [5, 4, 3];
  const total = ratings.reduce((sum, r) => sum + r, 0);
  const average = (total / ratings.length).toFixed(1);
  
  // 5 + 4 + 3 = 12 / 3 = 4.0
  expect(average).toBe("4.0");
});