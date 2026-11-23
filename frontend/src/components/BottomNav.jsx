import { NavLink } from 'react-router-dom';
import { useAuth, useCart } from '../context/StoreContexts.jsx';

export default function BottomNav() {
  const { user } = useAuth();
  const { items } = useCart();
  const count = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  return (
    <nav className="bottom-nav" aria-label="Main">
      <NavLink to="/products">Shop</NavLink>
      <NavLink to="/ai-assistant">AI Finder</NavLink>
      <NavLink to="/cart">Cart{count > 0 && <span className="badge">{count}</span>}</NavLink>
      <NavLink to={user ? '/orders' : '/login'}>{user ? 'Orders' : 'Sign in'}</NavLink>
    </nav>
  );
}
