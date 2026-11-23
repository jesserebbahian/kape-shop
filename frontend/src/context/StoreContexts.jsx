import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth } from '../api/client.js';

const AuthContext = createContext();
const CartContext = createContext();
const NetworkStatusContext = createContext();
const cartKey = 'kape_cart_snapshot';

export const useAuth = () => useContext(AuthContext);
export const useCart = () => useContext(CartContext);
export const useOnline = () => useContext(NetworkStatusContext);

function readSnapshot() {
  try {
    const value = JSON.parse(localStorage.getItem(cartKey));
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item
      && Number.isInteger(item.cartItemId)
      && typeof item.name === 'string'
      && [250, 500].includes(item.sizeG)
      && ['whole_bean', 'filter', 'espresso'].includes(item.grind)
      && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10
      && Number.isSafeInteger(item.unitPriceCents) && item.unitPriceCents >= 0);
  } catch {
    return [];
  }
}

export function StoreProviders({ children }) {
  const navigate = useNavigate();
  const [online, setOnline] = useState(navigator.onLine);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!auth.token);
  const [items, setItems] = useState(() => auth.token ? readSnapshot() : []);
  const [cartError, setCartError] = useState(null);
  const [cartLoading, setCartLoading] = useState(Boolean(auth.token));

  const signOut = useCallback(() => {
    auth.set(null);
    localStorage.removeItem(cartKey);
    setItems([]);
    setCartError(null);
    setCartLoading(false);
    setUser(null);
    setReady(true);
  }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const expired = () => {
      signOut();
      navigate('/login', { replace: true });
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('session:expired', expired);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('session:expired', expired);
    };
  }, [navigate, signOut]);

  useEffect(() => {
    const token = auth.token;
    if (!online || !token) return;
    const controller = new AbortController();
    api('/auth/me', { signal: controller.signal })
      .then(({ data }) => { if (auth.token === token && !controller.signal.aborted) setUser(data.user); })
      .catch((error) => { if (error.status === 401 && auth.token === token) signOut(); })
      .finally(() => { if (!controller.signal.aborted) setReady(true); });
    return () => controller.abort();
  }, [online, signOut]);

  const refreshCart = useCallback(async (signal) => {
    const token = auth.token;
    if (!user || !token || !online) return;
    setCartLoading(true);
    setCartError(null);
    try {
      const { data } = await api('/cart', { signal });
      if (auth.token !== token || signal?.aborted) return;
      setItems(data.items);
      localStorage.setItem(cartKey, JSON.stringify(data.items));
    } catch (error) {
      if (auth.token === token && !signal?.aborted) setCartError(error.message);
    } finally {
      if (auth.token === token && !signal?.aborted) setCartLoading(false);
    }
  }, [online, user]);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => refreshCart(controller.signal);
    refresh();
    window.addEventListener('cart:changed', refresh);
    return () => {
      controller.abort();
      window.removeEventListener('cart:changed', refresh);
    };
  }, [refreshCart]);

  const signIn = ({ token, user }) => {
    auth.set(token);
    setUser(user);
    setReady(true);
  };

  return (
    <NetworkStatusContext.Provider value={online}>
      <AuthContext.Provider value={{ user, ready: ready || !online, signIn, signOut }}>
        <CartContext.Provider value={{ items, setItems, refreshCart, cartLoading, cartError }}>
          {children}
        </CartContext.Provider>
      </AuthContext.Provider>
    </NetworkStatusContext.Provider>
  );
}
