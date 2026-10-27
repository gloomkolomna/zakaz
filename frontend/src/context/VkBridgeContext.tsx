import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import bridge, { parseURLSearchParamsForGetLaunchParams } from '@vkontakte/vk-bridge';
import { setVkLaunchInfo } from '../api/client';
import { parseVkParams } from '../vk/params';

interface VkContextType {
  vkUserId: number | null;
  isVkWebView: boolean;
  isDemo: boolean;
  launchParams: Record<string, string>;
  loading: boolean;
}

const VkBridgeContext = createContext<VkContextType>({
  vkUserId: null,
  isVkWebView: false,
  isDemo: false,
  launchParams: {},
  loading: true,
});

const DEMO_VK_ID = import.meta.env.VITE_DEMO_VK_ID
  ? Number(import.meta.env.VITE_DEMO_VK_ID)
  : null;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('vk-bridge timeout')), ms),
    ),
  ]);
}

function paramsOf(source: unknown): Record<string, string> {
  if (!source || typeof source !== 'object') return {};
  return Object.fromEntries(
    Object.entries(source as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

export function VkBridgeProvider({ children }: { children: ReactNode }) {
  const [vkUserId, setVkUserId] = useState<number | null>(null);
  const [isVkWebView, setIsVkWebView] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [launchParams, setLaunchParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applyInsetTop = (top: unknown) => {
      const px = Math.max(0, Number(top) || 0);
      document.documentElement.style.setProperty('--vk-inset-top', `${px}px`);
    };

    const listener = (e: any) => {
      const type = e?.detail?.type;
      const data = e?.detail?.data;
      if (!type || !data) return;
      if (type === 'VKWebAppUpdateConfig' || type === 'VKWebAppUpdateInsets') {
        const top = data?.insets?.top;
        if (top !== undefined) applyInsetTop(top);
      }
    };

    bridge.subscribe(listener);
    return () => {
      try {
        bridge.unsubscribe(listener);
      } catch {}
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        let id: number | null = null;
        let params: Record<string, string> = {};
        let inVk = false;

        try {
          const launch = parseURLSearchParamsForGetLaunchParams(
            window.location.search + window.location.hash,
          );
          if (launch && (launch as any).vk_user_id) {
            inVk = true;
            id = Number((launch as any).vk_user_id);
            params = paramsOf(launch);
          }
        } catch {}

        if (!id) {
          const fallback = parseVkParams(window.location.search, window.location.hash);
          if (fallback.vkUserId) {
            inVk = true;
            id = fallback.vkUserId;
            params = fallback.params;
          }
        }

        bridge.send('VKWebAppInit').catch(() => {});

        if (!id) {
          try {
            const launch = await withTimeout(bridge.send('VKWebAppGetLaunchParams'), 3000);
            if (launch && (launch as any).vk_user_id) {
              inVk = true;
              id = Number((launch as any).vk_user_id);
              params = paramsOf(launch);
            }
          } catch {}
        }

        if (id) {
          setIsVkWebView(inVk);
          setVkUserId(id);
          setLaunchParams(params);
          const current = getComputedStyle(document.documentElement)
            .getPropertyValue('--vk-inset-top')
            .trim();
          if (!current || current === '0px') {
            document.documentElement.style.setProperty('--vk-inset-top', '48px');
          }
        } else if (DEMO_VK_ID) {
          setIsDemo(true);
          setVkUserId(DEMO_VK_ID);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setVkLaunchInfo(vkUserId, launchParams);
  }, [vkUserId, launchParams]);

  return (
    <VkBridgeContext.Provider value={{ vkUserId, isVkWebView, isDemo, launchParams, loading }}>
      {children}
    </VkBridgeContext.Provider>
  );
}

export function useVkBridge() {
  return useContext(VkBridgeContext);
}
