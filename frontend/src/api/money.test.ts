import { describe, expect, it } from 'vitest';
import { formatDate, formatEarlyUntil, formatPrice } from './money';

describe('money', () => {
  it('форматирует целые рубли', () => {
    expect(formatPrice(1250).replace(/\u00a0/g, ' ')).toBe('1 250 ₽');
    expect(formatPrice(0)).toBe('0 ₽');
  });

  it('показывает прочерк без цены', () => {
    expect(formatPrice(null)).toBe('—');
    expect(formatPrice(undefined)).toBe('—');
  });

  it('переводит дату в московское время', () => {
    expect(formatDate('2026-10-26T06:20:00Z')).toBe('26 октября, 09:20');
    expect(formatEarlyUntil('2026-10-29T12:00:00Z')).toBe('Откроется 29 октября в 15:00');
  });
});
