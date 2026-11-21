import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, type AdminSection } from '../../api/endpoints';
import { ConfirmProvider } from '../../components/ConfirmProvider';
import ProductsTab from './ProductsTab';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sections: AdminSection[] = [{ id: 2, title: 'Наборы', sort_order: 1, is_active: true, products_count: 0 }];

function typeText(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function chooseOption(select: HTMLSelectElement, value: string) {
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('ProductsTab', () => {
  let container: HTMLDivElement;
  let root: Root;
  let products: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(api, 'adminSections').mockResolvedValue(sections);
    products = vi.spyOn(api, 'adminProducts').mockResolvedValue([]);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function renderTab() {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/admin/products']}>
          <ConfirmProvider>
            <ProductsTab />
          </ConfirmProvider>
        </MemoryRouter>,
      );
    });
  }

  it('применяет фильтры автоматически, без кнопки поиска', async () => {
    await renderTab();

    expect(products).toHaveBeenCalledTimes(1);
    const labels = Array.from(container.querySelectorAll('button')).map((button) => button.textContent);
    expect(labels).not.toContain('Найти');
    expect(labels).not.toContain('Применить');
  });

  it('ищет по названию только после паузы ввода', async () => {
    await renderTab();
    const input = container.querySelector<HTMLInputElement>('#product-filter-q');
    expect(input).not.toBeNull();

    act(() => typeText(input!, 'Набор'));
    await act(async () => {
      vi.advanceTimersByTime(349);
    });
    expect(products).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(products).toHaveBeenCalledTimes(2);
    expect(products).toHaveBeenLastCalledWith(undefined, 'Набор');
  });

  it('применяет выбранный раздел сразу', async () => {
    await renderTab();
    const select = container.querySelector<HTMLSelectElement>('#product-filter-section');
    expect(select).not.toBeNull();

    await act(async () => chooseOption(select!, '2'));

    expect(products).toHaveBeenCalledTimes(2);
    expect(products).toHaveBeenLastCalledWith(2, undefined);
  });
});
