import { describe, expect, it } from 'vitest';
import { matchesVkSession } from './session';

describe('session', () => {
  it('принимает только сессию текущего VK-пользователя', () => {
    expect(matchesVkSession(123, 123)).toBe(true);
    expect(matchesVkSession(123, 124)).toBe(false);
    expect(matchesVkSession(123, null)).toBe(false);
  });
});
