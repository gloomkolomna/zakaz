import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Logo from './components/Logo';
import MiniAppShell from './components/MiniAppShell';
import { useSession } from './context/SessionContext';
import { useVkBridge } from './context/VkBridgeContext';
import MembersOnly from './pages/MembersOnly';
import OutsideVk from './pages/OutsideVk';

const Catalog = lazy(() => import('./pages/Catalog'));
const Product = lazy(() => import('./pages/Product'));
const Builder = lazy(() => import('./pages/Builder'));
const Review = lazy(() => import('./pages/Review'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Info = lazy(() => import('./pages/Info'));
const Admin = lazy(() => import('./pages/admin/Admin'));
const SectionsTab = lazy(() => import('./pages/admin/SectionsTab'));
const ProductsTab = lazy(() => import('./pages/admin/ProductsTab'));
const ProductEdit = lazy(() => import('./pages/admin/ProductEdit'));
const OrdersTab = lazy(() => import('./pages/admin/OrdersTab'));
const AdminOrderDetail = lazy(() => import('./pages/admin/AdminOrderDetail'));
const PlayersTab = lazy(() => import('./pages/admin/PlayersTab'));
const TextsTab = lazy(() => import('./pages/admin/TextsTab'));
const LogsTab = lazy(() => import('./pages/admin/LogsTab'));

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
          <span>Магазин игр</span>
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
          <span>Магазин игр</span>
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
      <ErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/product/:id/build" element={<Builder />} />
            <Route path="/product/:id/review" element={<Review />} />
            <Route path="/order/:id/success" element={<OrderSuccess />} />
            <Route path="/orders" element={<MyOrders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/info" element={<Info />} />
            <Route
              path="/admin"
              element={user.role === 'admin' ? <Admin /> : <Navigate to="/" replace />}
            >
              <Route index element={<Navigate to="sections" replace />} />
              <Route path="sections" element={<SectionsTab />} />
              <Route path="products" element={<ProductsTab />} />
              <Route path="products/:id" element={<ProductEdit />} />
              <Route path="orders" element={<OrdersTab />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="players" element={<PlayersTab />} />
              <Route path="texts" element={<TextsTab />} />
              <Route path="logs" element={<LogsTab />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </MiniAppShell>
  );
}
