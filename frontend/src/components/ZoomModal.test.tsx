import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ZoomModal from './ZoomModal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const images = [
  { url: '/one.jpg', alt: 'Роза — фото 1' },
  { url: '/two.jpg', alt: 'Роза — фото 2' },
  { url: '/three.jpg', alt: 'Роза — фото 3' },
];

describe('ZoomModal', () => {
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

  it('показывает все миниатюры и переключает крупное фото по нажатию', () => {
    const onIndexChange = vi.fn();
    act(() => {
      root.render(
        <ZoomModal
          src="/one.jpg"
          alt="Роза — фото 1"
          images={images}
          onIndexChange={onIndexChange}
          onClose={vi.fn()}
        />,
      );
    });

    const thumbnails = document.querySelectorAll<HTMLButtonElement>('.zoom-thumb');
    expect(thumbnails).toHaveLength(3);

    const second = document.querySelector<HTMLButtonElement>('button[aria-label="Показать фото 2"]');
    act(() => {
      second?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.querySelector<HTMLImageElement>('.zoom-stage > img')?.src).toContain('/two.jpg');
    expect(document.querySelector<HTMLImageElement>('.zoom-stage > img')?.alt).toBe('Роза — фото 2');
    expect(second?.getAttribute('aria-pressed')).toBe('true');
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });
});
