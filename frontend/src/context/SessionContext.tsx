import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { clearToken, getToken, saveToken } from '../api/client';
import { api, type MeUser } from '../api/endpoints';
import { useVkBridge } from './VkBridgeContext';

interface SessionState {
  user: MeUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  logout: () => void;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({
  user: null,
  token: null,
  loading: true,
  error: null,
  errorCode: null,
  logout: () => {},
  refresh: async () => {},
});

function extractError(e: any): { message: string | null; code: string | null } {
  const detail = e?.response?.data?.detail;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    return { message: detail.message || 'Ошибка авторизации', code: detail.code || null };
  }
  return { message: (typeof detail === 'string' && detail) || 'Ошибка авторизации', code: null };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { vkUserId, loading: vkLoading, launchParams } = useVkBridge();
  const [user, setUser] = useState<MeUser | null>(null);
  const [token, setToken] = useState<string | null>(getToken());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function login(): Promise<MeUser> {
    if (vkUserId == null) throw new Error('Нет VK ID');
    const session = await api.session({ ...launchParams, vk_user_id: String(vkUserId) });
    saveToken(session.token);
    setToken(session.token);
    setError(null);
    setErrorCode(null);
    return api.me();
  }

  useEffect(() => {
    if (vkLoading || vkUserId == null) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        if (token) {
          try {
            const me = await api.me();
            if (!cancelled) {
              setUser(me);
              setLoading(false);
            }
            return;
          } catch (e: any) {
            if (e?.response?.status === 403) throw e;
            clearToken();
            setToken(null);
          }
        }
        const me = await login();
        if (!cancelled) {
          setUser(me);
          setLoading(false);
        }
      } catch (e: any) {
        if (cancelled) return;
        const { message, code } = extractError(e);
        setError(message);
        setErrorCode(code);
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [vkUserId, vkLoading, launchParams]);

  function logout() {
    clearToken();
    setToken(null);
    setUser(null);
  }

  async function refresh() {
    if (vkUserId == null) return;
    setLoading(true);
    try {
      const me = await login();
      setUser(me);
      setError(null);
      setErrorCode(null);
    } catch (e: any) {
      const { message, code } = extractError(e);
      setError(message);
      setErrorCode(code);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SessionContext.Provider value={{ user, token, loading, error, errorCode, logout, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
