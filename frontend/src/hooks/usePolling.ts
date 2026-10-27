import { useEffect, useRef } from 'react';

export function usePolling(callback: () => void | Promise<void>, intervalMs: number): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    function run() {
      if (document.visibilityState !== 'visible') return;
      void Promise.resolve(callbackRef.current()).catch(() => {});
    }

    const timer = window.setInterval(run, intervalMs);
    function onVisible() {
      if (document.visibilityState === 'visible') run();
    }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [intervalMs]);
}
