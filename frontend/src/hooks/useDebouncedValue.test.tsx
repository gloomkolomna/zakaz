import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let current: string;

function Probe({ value, delay }: { value: string; delay: number }) {
  current = useDebouncedValue(value, delay);
  return null;
}

function render(value: string, delay = 300) {
  act(() => root.render(<Probe value={value} delay={delay} />));
}

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('возвращает начальное значение сразу', () => {
    render('а');
    expect(current).toBe('а');
  });

  it('обновляет значение только после задержки', () => {
    render('а');
    render('аб');
    expect(current).toBe('а');
    act(() => vi.advanceTimersByTime(299));
    expect(current).toBe('а');
    act(() => vi.advanceTimersByTime(1));
    expect(current).toBe('аб');
  });

  it('сбрасывает таймер при быстром вводе', () => {
    render('');
    render('и');
    act(() => vi.advanceTimersByTime(200));
    render('ива');
    act(() => vi.advanceTimersByTime(200));
    expect(current).toBe('');
    act(() => vi.advanceTimersByTime(100));
    expect(current).toBe('ива');
  });
});
