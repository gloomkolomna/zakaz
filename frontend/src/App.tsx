import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Logo from './components/Logo';
import MiniAppShell from './components/MiniAppShell';
import { useSession } from './context/SessionContext';
import { useVkBridge } from './context/VkBridgeContext';
import MembersOnly from './pages/MembersOnly';
import OutsideVk from './pages/OutsideVk';

const Catalog = lazy(() => import('./pages/Catalog'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const Info = lazy(() => import('./pages/Info'));
const Admin = lazy(() => import('./pages/admin/Admin'));

function PageSkeleton() {
  return (
    <main className="page" aria-busy="true">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line short" />
    </main>
  );
}

function LoadingScreen() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span>СобериЗаказ</span>
        </div>
      </header>
      <PageSkeleton />
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span>СобериЗаказ</span>
        </div>
      </header>
      <main className="page">
        <div className="notice">
          <h1>Не удалось войти</h1>
          <p>{message}</p>
          <div className="notice-actions">
            <button className="btn" type="button" onClick={onRetry}>
              Попробовать снова
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const { vkUserId, loading: vkLoading } = useVkBridge();
  const { user, loading, error, errorCode, refresh } = useSession();

  if (vkLoading) return <LoadingScreen />;
  if (vkUserId == null) return <OutsideVk />;
  if (loading) return <LoadingScreen />;
  if (errorCode === 'members_only') return <MembersOnly />;
  if (!user) return <ErrorScreen message={error || 'Неизвестная ошибка'} onRetry={refresh} />;

  return (
    <MiniAppShell>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/info" element={<Info />} />
          <Route
            path="/admin"
            element={user.role === 'admin' ? <Admin /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </MiniAppShell>
  );
}
