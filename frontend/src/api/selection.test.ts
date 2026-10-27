import { describe, expect, it } from 'vitest';
import {
  buildItems,
  canSubmit,
  selectionTotal,
  setQty,
  stepHasSelection,
  toggleCard,
  type SelectableStep,
} from './selection';

const steps: SelectableStep[] = [
  {
    id: 1,
    mode: 'single',
    is_required: true,
    cards: [
      { id: 11, price: 1000, max_qty: 2 },
      { id: 12, price: 1500, max_qty: 2 },
    ],
  },
  {
    id: 2,
    mode: 'multi',
    is_required: false,
    cards: [
      { id: 21, price: 120, max_qty: 5 },
      { id: 22, price: 200, max_qty: 5 },
    ],
  },
];

describe('selection', () => {
  it('в режиме одного варианта заменяет выбор', () => {
    let selected = toggleCard({}, steps[0], steps[0].cards[0]);
    expect(selected).toEqual({ 11: 1 });
    selected = toggleCard(selected, steps[0], steps[0].cards[1]);
    expect(selected).toEqual({ 12: 1 });
  });

  it('повторный тап снимает выбор', () => {
    const selected = toggleCard({ 12: 1 }, steps[0], steps[0].cards[1]);
    expect(selected).toEqual({});
  });

  it('в режиме нескольких добавляет карточки', () => {
    let selected = toggleCard({}, steps[1], steps[1].cards[0]);
    selected = toggleCard(selected, steps[1], steps[1].cards[1]);
    expect(selected).toEqual({ 21: 1, 22: 1 });
  });

  it('меняет количество в границах', () => {
    expect(setQty({ 21: 1 }, 21, 3, 5)).toEqual({ 21: 3 });
    expect(setQty({ 21: 3 }, 21, 99, 5)).toEqual({ 21: 5 });
    expect(setQty({ 21: 1 }, 21, 0, 5)).toEqual({});
  });

  it('считает сумму и обязательность', () => {
    const selected = { 12: 1, 21: 2 };
    expect(selectionTotal(selected, steps)).toBe(1740);
    expect(canSubmit({}, steps)).toBe(false);
    expect(canSubmit({ 12: 1 }, steps)).toBe(true);
    expect(stepHasSelection({ 21: 1 }, steps[1])).toBe(true);
  });

  it('собирает payload в порядке шагов и карточек', () => {
    expect(buildItems({ 22: 2, 11: 1 }, steps)).toEqual([
      { card_id: 11, qty: 1 },
      { card_id: 22, qty: 2 },
    ]);
  });
});
