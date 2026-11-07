import { describe, expect, it } from 'vitest';
import { discountAmount } from './DiscountSummary';

describe('discountAmount', () => {
  it('calculates percent and rounds to nearest ruble', () => {
    expect(discountAmount(1240, 5)).toBe(62);
    expect(discountAmount(1990, 5)).toBe(100);
    expect(discountAmount(1000, 0)).toBe(0);
  });
});
