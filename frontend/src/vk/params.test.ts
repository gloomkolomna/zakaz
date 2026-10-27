import { describe, expect, it } from 'vitest';
import { parseVkParams } from './params';

describe('parseVkParams', () => {
  it('читает vk_user_id из query', () => {
    const result = parseVkParams('?vk_user_id=400977&vk_app_id=54856596');
    expect(result.vkUserId).toBe(400977);
    expect(result.params.vk_app_id).toBe('54856596');
  });

  it('читает vk_user_id из hash', () => {
    const result = parseVkParams('#vk_user_id=123&sign=abc');
    expect(result.vkUserId).toBe(123);
    expect(result.params.sign).toBe('abc');
  });

  it('склеивает query и hash', () => {
    const result = parseVkParams('?vk_user_id=1', '#vk_app_id=2&sign=s');
    expect(result.vkUserId).toBe(1);
    expect(result.params).toEqual({ vk_user_id: '1', vk_app_id: '2', sign: 's' });
  });

  it('декодирует значения', () => {
    const result = parseVkParams('?vk_user_id=5&vk_ref=%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3');
    expect(result.params.vk_ref).toBe('каталог');
  });

  it('возвращает null без vk_user_id', () => {
    const result = parseVkParams('?vk_app_id=1', '');
    expect(result.vkUserId).toBeNull();
    expect(result.params).toEqual({ vk_app_id: '1' });
  });

  it('игнорирует пустой и нечисловой vk_user_id', () => {
    expect(parseVkParams('?vk_user_id=').vkUserId).toBeNull();
    expect(parseVkParams('?vk_user_id=abc').vkUserId).toBeNull();
    expect(parseVkParams('?vk_user_id=0').vkUserId).toBeNull();
  });
});
