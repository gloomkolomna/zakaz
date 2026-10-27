import type { Selected } from '../api/selection';

const PREFIX = 'zakaz:draft:';

function key(productId: number): string {
  return `${PREFIX}${productId}`;
}

export function readDraft(productId: number): Selected {
  try {
    const raw = sessionStorage.getItem(key(productId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Selected = {};
    for (const [cardId, qty] of Object.entries(parsed)) {
      const id = Number(cardId);
      const value = Number(qty);
      if (Number.isFinite(id) && Number.isFinite(value) && value > 0) {
        result[id] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function writeDraft(productId: number, selected: Selected): void {
  try {
    sessionStorage.setItem(key(productId), JSON.stringify(selected));
  } catch {}
}

export function clearDraft(productId: number): void {
  try {
    sessionStorage.removeItem(key(productId));
  } catch {}
}
