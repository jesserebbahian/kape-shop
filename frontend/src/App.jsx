import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth, useOnline } from './context/StoreContexts.jsx';
import StoreHero from './components/StoreHero.jsx';
import BottomNav from './components/BottomNav.jsx';
import Skeleton from './components/Skeleton.jsx';

const Shop = lazy(() => import('./pages/Shop.jsx'));
const Product = lazy(() => import('./pages/Shop.jsx').then((module) => ({ default: module.ProductDetail })));
const Finder = lazy(() => import('./pages/Shop.jsx').then((module) => ({ default: module.FinderPanel })));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx').then((module) => ({ default: module.OrderList })));
const Order = lazy(() => import('./pages/Orders.jsx').then((module) => ({ default: module.OrderDetail })));

function Protected({ children, admin = false, offlineCart = false }) {
  const { user, ready } = useAuth();
  const online = useOnline();
  const location = useLocation();
  if (!online) return offlineCart ? children : <p className="notice warn">Reconnect to open this page.</p>;
  if (!ready) return <Skeleton label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && user.role !== 'admin') return <p className="notice error">Administrator access required.</p>;
  return children;
}

function SignIn({ mode }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  return <AuthPage mode={mode} onSignedIn={(session) => {
    signIn(session);
    navigate(state?.from || '/products', { replace: true });
  }} />;
}

function Detail() {
  const { id } = useParams();
  return <Order key={id} id={id} />;
}

function PaymentReturn() {
  const [params] = useSearchParams();
  const id = params.get('orderId');
  return <section className="stack">
    <h1>Payment status</h1>
    {/^\d+$/.test(id || '') ? <Order key={id} id={id} /> : <p>Open <Link to="/orders">your orders</Link> to check the payment.</p>}
  </section>;
}

export default function App() {
  const online = useOnline();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (location.hash.startsWith('#/')) {
    return <Navigate to={location.hash.slice(1)} replace />;
  }
  const home = location.pathname === '/';
  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <Link className="brand" to="/"><img src="/icons/kape-192.png" width="36" height="36" alt="" />Kape Shop</Link>
          <BottomNav />
          {user?.role === 'admin' && <Link className="btn ghost" to="/admin">Admin</Link>}
          {user && <button className="btn ghost" onClick={() => { signOut(); navigate('/'); }}>Sign out</button>}
        </div>
      </header>
      {!online && <aside className="offline-banner" role="status">Offline mode · Browse saved products and view your cart. Reconnect to make changes or pay.</aside>}
      <main className={home ? 'store-home' : 'wrap'}>
        {home && <StoreHero />}
        <Suspense fallback={<Skeleton />}>
          <Routes>
            <Route path="/" element={<Shop featured />} />
            <Route path="/products" element={<Shop />} />
            <Route path="/products/:id" element={<Product />} />
            <Route path="/ai-assistant" element={<Finder />} />
            <Route path="/cart" element={<Protected offlineCart><Cart /></Protected>} />
            <Route path="/checkout" element={<Protected offlineCart><Cart checkout /></Protected>} />
            <Route path="/orders" element={<Protected><Orders /></Protected>} />
            <Route path="/orders/:id" element={<Protected><Detail /></Protected>} />
            <Route path="/payment/success" element={<Protected><PaymentReturn /></Protected>} />
            <Route path="/payment/cancelled" element={<Protected><PaymentReturn /></Protected>} />
            <Route path="/login" element={<SignIn key="login" mode="login" />} />
            <Route path="/register" element={<SignIn key="register" mode="register" />} />
            <Route path="/admin/*" element={<Protected admin><Admin /></Protected>} />
            <Route path="*" element={<section><h1>Page not found</h1><Link to="/products">Back to the shop</Link></section>} />
          </Routes>
        </Suspense>
      </main>
      <footer className="wrap site-footer">Kape · Philippine coffee roasted to order</footer>
    </>
  );
}
