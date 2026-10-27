export type SelectionMode = 'single' | 'multi';

export interface SelectableCard {
  id: number;
  price: number;
  max_qty: number;
}

export interface SelectableStep {
  id: number;
  mode: SelectionMode;
  is_required: boolean;
  cards: SelectableCard[];
}

export type Selected = Record<number, number>;

export function toggleCard(selected: Selected, step: SelectableStep, card: SelectableCard): Selected {
  const next: Selected = { ...selected };
  if (next[card.id]) {
    delete next[card.id];
    return next;
  }
  if (step.mode === 'single') {
    for (const candidate of step.cards) {
      delete next[candidate.id];
    }
  }
  next[card.id] = 1;
  return next;
}

export function setQty(selected: Selected, cardId: number, qty: number, max: number): Selected {
  const next: Selected = { ...selected };
  if (qty <= 0) {
    delete next[cardId];
    return next;
  }
  next[cardId] = Math.max(1, Math.min(max, qty));
  return next;
}

export function removeCard(selected: Selected, cardId: number): Selected {
  const next: Selected = { ...selected };
  delete next[cardId];
  return next;
}

export function selectedInStep(selected: Selected, step: SelectableStep): number[] {
  return step.cards.filter((card) => Boolean(selected[card.id])).map((card) => card.id);
}

export function stepHasSelection(selected: Selected, step: SelectableStep): boolean {
  return selectedInStep(selected, step).length > 0;
}

export function stepTotal(selected: Selected, step: SelectableStep): number {
  return step.cards.reduce((sum, card) => sum + (selected[card.id] || 0) * card.price, 0);
}

export function selectionTotal(selected: Selected, steps: SelectableStep[]): number {
  return steps.reduce((sum, step) => sum + stepTotal(selected, step), 0);
}

export function selectionCount(selected: Selected): number {
  return Object.values(selected).filter((qty) => qty > 0).length;
}

export function canSubmit(selected: Selected, steps: SelectableStep[]): boolean {
  return steps.every((step) => !step.is_required || stepHasSelection(selected, step));
}

export function buildItems(selected: Selected, steps: SelectableStep[]): { card_id: number; qty: number }[] {
  const items: { card_id: number; qty: number }[] = [];
  for (const step of steps) {
    for (const card of step.cards) {
      const qty = selected[card.id];
      if (qty) items.push({ card_id: card.id, qty });
    }
  }
  return items;
}
