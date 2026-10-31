import { describe, expect, it } from 'vitest';
import { plural } from './plural';

const forms = ['карточка', 'карточки', 'карточек'] as const;

describe('plural', () => {
  it('выбирает форму для одного', () => {
    expect(plural(1, ...forms)).toBe('карточка');
    expect(plural(21, ...forms)).toBe('карточка');
    expect(plural(101, ...forms)).toBe('карточка');
  });

  it('выбирает форму для двух, трёх и четырёх', () => {
    expect(plural(2, ...forms)).toBe('карточки');
    expect(plural(3, ...forms)).toBe('карточки');
    expect(plural(4, ...forms)).toBe('карточки');
    expect(plural(22, ...forms)).toBe('карточки');
    expect(plural(104, ...forms)).toBe('карточки');
  });

  it('выбирает форму для нуля, пяти и одиннадцати', () => {
    expect(plural(0, ...forms)).toBe('карточек');
    expect(plural(5, ...forms)).toBe('карточек');
    expect(plural(11, ...forms)).toBe('карточек');
    expect(plural(12, ...forms)).toBe('карточек');
    expect(plural(14, ...forms)).toBe('карточек');
    expect(plural(25, ...forms)).toBe('карточек');
    expect(plural(100, ...forms)).toBe('карточек');
    expect(plural(111, ...forms)).toBe('карточек');
  });

  it('не зависит от знака', () => {
    expect(plural(-3, ...forms)).toBe('карточки');
  });
});
