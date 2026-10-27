import { describe, expect, it } from 'vitest';
import { mediaUrl } from './media';

describe('mediaUrl', () => {
  it('оставляет внешние ссылки', () => {
    expect(mediaUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });

  it('добавляет базовый путь к загрузкам', () => {
    expect(mediaUrl('/api/uploads/a.jpg')).toMatch(/\/api\/uploads\/a\.jpg$/);
  });

  it('возвращает пустую строку без пути', () => {
    expect(mediaUrl(null)).toBe('');
  });
});
