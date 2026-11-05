import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Card } from '../api/endpoints';
import PickCard from './PickCard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const card: Card = {
  id: 7,
  title: 'Роза',
  description: 'Вышивка на деревянной основе',
  image_url: '/api/uploads/rose.jpg',
  images: [{ id: 1, url: '/api/uploads/rose.jpg', sort_order: 0 }],
  price: 120,
  max_qty: 5,
};

describe('PickCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('разделяет выбор варианта и открытие фото, показывает описание и количество', () => {
    const onToggle = vi.fn();
    const onView = vi.fn();
    const onQuantityChange = vi.fn();

    act(() => {
      root.render(
        <PickCard
          card={card}
          active
          quantity={2}
          onToggle={onToggle}
          onView={onView}
          onQuantityChange={onQuantityChange}
        />,
      );
    });

    expect(container.textContent).toContain('Вышивка на деревянной основе');
    expect(container.textContent).toContain('120 ₽');

    const thumb = container.querySelector<HTMLButtonElement>('.pick-thumb');
    expect(thumb?.getAttribute('aria-label')).toBe('Фото: Роза');
    act(() => {
      thumb?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onView).toHaveBeenCalledOnce();
    expect(onToggle).not.toHaveBeenCalled();

    const main = container.querySelector<HTMLDivElement>('.pick-main');
    act(() => {
      main?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onToggle).toHaveBeenCalledOnce();

    const increase = container.querySelector<HTMLButtonElement>('button[aria-label="Увеличить количество"]');
    act(() => {
      increase?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onQuantityChange).toHaveBeenCalledWith(3);
    expect(onToggle).toHaveBeenCalledOnce();

    act(() => {
      increase?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('скрывает количество у невыбранного варианта', () => {
    act(() => {
      root.render(
        <PickCard card={card} active={false} onToggle={vi.fn()} onView={vi.fn()} onQuantityChange={vi.fn()} />,
      );
    });

    expect(container.querySelector('.pick-qty')).toBeNull();
  });
});
