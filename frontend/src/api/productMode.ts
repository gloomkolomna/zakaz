import type { ProductMode } from './endpoints';

export function productModePayload(mode: ProductMode, rawPrice: string): { mode: ProductMode; price?: number } {
  if (mode === 'build') return { mode };
  const price = Number(rawPrice.trim());
  if (!rawPrice.trim() || !Number.isInteger(price) || price < 0) {
    throw new Error('Цена — целое число от 0 ₽');
  }
  return { mode, price };
}
