import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeDraft } from '../api/draft';
import { api, type ProductDetail } from '../api/endpoints';
import Builder from './Builder';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const product: ProductDetail = {
  id: 1,
  title: 'Набор',
  description: null,
  mode: 'build',
  price: null,
  image_url: null,
  images: [],
  section_title: 'Наборы',
  from_price: 100,
  stock: 0,
  sold_out: false,
  reserved: false,
  is_hidden: false,
  video: null,
  early_until: null,
  is_early: false,
  can_order: true,
  early_reason: null,
  steps: [
    {
      id: 10,
      title: 'Основа',
      hint: null,
      mode: 'single',
      is_required: true,
      cards: [
        { id: 100, title: 'Дерево', description: null, image_url: null, images: [], price: 100, max_qty: 5 },
      ],
    },
    {
      id: 20,
      title: 'Оформление',
      hint: null,
      mode: 'single',
      is_required: true,
      cards: [
        { id: 200, title: 'Рамка', description: null, image_url: null, images: [], price: 200, max_qty: 5 },
      ],
    },
  ],
};

describe('Builder', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(api, 'product').mockResolvedValue(product);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('возвращает на предыдущий шаг без потери выбора', async () => {
    writeDraft(product.id, { 100: 2 });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/product/1/build?step=1']}>
          <Routes>
            <Route path="/product/:id/build" element={<Builder />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(container.querySelector('h1')?.textContent).toBe('Оформление');
    const back = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Назад');
    expect(back).toBeDefined();

    act(() => {
      back?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('h1')?.textContent).toBe('Основа');
    expect(container.querySelector('.pick')?.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.pick-qty')?.textContent).toContain('2');
    expect(Array.from(container.querySelectorAll('button')).some((button) => button.textContent === 'Назад')).toBe(false);
  });
});
