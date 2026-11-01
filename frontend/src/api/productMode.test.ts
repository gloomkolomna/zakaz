import { describe, expect, it } from 'vitest';
import { productModePayload } from './productMode';

describe('productModePayload', () => {
  it('отправляет цену вместе с одиночным режимом', () => {
    expect(productModePayload('single', '0')).toEqual({ mode: 'single', price: 0 });
    expect(productModePayload('single', '1250')).toEqual({ mode: 'single', price: 1250 });
  });

  it('не отправляет цену при возврате к сборному режиму', () => {
    expect(productModePayload('build', '1250')).toEqual({ mode: 'build' });
  });

  it('отклоняет некорректную цену', () => {
    expect(() => productModePayload('single', '')).toThrow('Цена — целое число от 0 ₽');
    expect(() => productModePayload('single', '-1')).toThrow('Цена — целое число от 0 ₽');
  });
});
