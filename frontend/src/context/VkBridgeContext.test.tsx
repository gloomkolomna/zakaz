import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVkBridge, VkBridgeProvider } from './VkBridgeContext';

vi.mock('@vkontakte/vk-bridge', async () => {
  const actual = await vi.importActual<typeof import('@vkontakte/vk-bridge')>('@vkontakte/vk-bridge');
  return {
    ...actual,
    default: {
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      send: vi.fn().mockResolvedValue({}),
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function LaunchParams() {
  const { launchParams } = useVkBridge();
  return <div data-testid="sign">{launchParams.sign}|{launchParams.vk_new_parameter}</div>;
}

describe('VkBridgeProvider launch params', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.history.replaceState(
      {},
      '',
      '/zakaz/?vk_user_id=168732789&vk_platform=desktop_web&vk_new_parameter=value&sign=abc_-#/profile',
    );
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState({}, '', '/zakaz/');
  });

  it('не искажает sign и сохраняет все vk-параметры на desktop', async () => {
    await act(async () => {
      root.render(<VkBridgeProvider><LaunchParams /></VkBridgeProvider>);
    });

    expect(container.textContent).toBe('abc_-|value');
  });
});
