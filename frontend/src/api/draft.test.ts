import { describe, expect, it, beforeEach } from 'vitest';
import { clearDraft, readDraft, writeDraft } from './draft';

describe('draft', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('сохраняет и читает выбор', () => {
    writeDraft(7, { 11: 2, 12: 1 });
    expect(readDraft(7)).toEqual({ 11: 2, 12: 1 });
  });

  it('возвращает пустой выбор для другого товара', () => {
    writeDraft(7, { 11: 1 });
    expect(readDraft(8)).toEqual({});
  });

  it('очищает черновик', () => {
    writeDraft(7, { 11: 1 });
    clearDraft(7);
    expect(readDraft(7)).toEqual({});
  });

  it('игнорирует битые данные', () => {
    sessionStorage.setItem('zakaz:draft:7', '{bad');
    expect(readDraft(7)).toEqual({});
  });
});
