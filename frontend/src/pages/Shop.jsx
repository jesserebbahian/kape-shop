import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth, useOnline } from '../context/StoreContexts.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Skeleton from '../components/Skeleton.jsx';
import RoastStrip from '../components/RoastStrip.jsx';
import { useEffect, useState } from 'react';
import { api, notifyCart } from '../api/client.js';
import { peso, GRIND_LABELS } from '../utils/format.js';
import { useLoad } from '../hooks/useLoad.js';
import CoffeeImage from '../components/CoffeeImage.jsx';

const CATEGORIES = ['Single Origin', 'Blend', 'Barako', 'Robusta', 'Specialty'];

export function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { data, error, loading } = useLoad((signal) => api(`/products/${id}`, { signal }), [id]);
  const [sizeG, setSizeG] = useState(250);
  const [grind, setGrind] = useState('whole_bean');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState(null);
  const product = data?.data;

  const add = async () => {
    if (!user) return navigate('/login', { state: { from: `/products/${id}` } });
    setBusy(true);
    setMessage(null);
    try {
      await api('/cart/items', { method: 'POST', body: { productId: Number(id), sizeG, grind, quantity } });
      notifyCart();
      setMessage({ kind: 'ok', text: 'Added to your cart.' });
    } catch (err) {
      setMessage({ kind: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel stack">
        <Link to="/products">Back to beans</Link>
        {loading && !product && <Skeleton label="Loading coffee…" />}
        {error && <div className="notice error">{error.message}</div>}
        {product && (
          <>
            <CoffeeImage product={product} size="dialog" />
            <div>
              <h1>{product.name}</h1>
              <p className="muted">{product.origin}, {product.roastLevel} roast, {product.category}</p>
            </div>
            <p>{product.description}</p>
            <p><strong>Tasting notes:</strong> {product.tastingNotes}</p>
            <div className="row">
              <div className="field">
                <label htmlFor="size">Bag size</label>
                <select id="size" value={sizeG} onChange={(e) => setSizeG(Number(e.target.value))}>
                  <option value={250}>250 g</option>
                  <option value={500}>500 g (5% off)</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="grind">Grind</label>
                <select id="grind" value={grind} onChange={(e) => setGrind(e.target.value)}>
                  {Object.entries(GRIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="qty">Quantity</label>
                <input id="qty" type="number" min={1} max={10} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
              </div>
            </div>
            <p className="price">{peso(product.priceTable[sizeG][grind])} each</p>
            {Number.isInteger(product.remainingRoastUnits) && <p className="muted">
              {online ? 'Available roast capacity' : 'Last saved roast capacity'} · {product.remainingRoastUnits} units
            </p>}
            {message && <div className={`notice ${message.kind}`} role="status">{message.text}</div>}
            <div className="purchase-bar">
              <button className="btn" onClick={add} disabled={!online || busy}>{busy ? 'Adding…' : user || !online ? 'Add to cart' : 'Sign in to order'}</button>
              <Link className="btn ghost" to="/cart">View cart</Link>
            </div>
          </>
        )}
    </section>
  );
}

export function FinderPanel() {
  const online = useOnline();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const ask = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api('/ai/discover', { method: 'POST', body: { query } });
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel stack" aria-labelledby="finder-title">
      <div>
        <h2 id="finder-title">Not sure what to pick?</h2>
        <p className="muted">Describe the coffee you want and we will suggest beans from what is on the shelf.</p>
      </div>
      <form className="row" onSubmit={ask}>
        <div className="grow">
          <label htmlFor="finder" className="muted">Your request</label>
          <input id="finder" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={200} minLength={2} required placeholder="Sweet, low acidity, for milk coffee" />
        </div>
        <button className="btn" disabled={busy || !online} style={{ alignSelf: 'end' }}>{busy ? 'Finding…' : 'Find my coffee'}</button>
      </form>
      {!online && <p className="muted">Reconnect to use AI discovery.</p>}
      {error && <div className="notice error" role="alert">{error} <Link to={`/products?q=${encodeURIComponent(query)}`}>Search the catalog</Link></div>}
      {result && (
        <div className="stack" aria-live="polite">
          <div className={`notice ${result.aiAssisted ? '' : 'warn'}`}>
            {result.aiAssisted ? 'AI-assisted suggestions. Prices and details come from our catalog.' : 'AI is unavailable right now, so these are keyword matches from our catalog.'}
          </div>
          {result.picks.map(({ product, reason }) => (
            <div key={product.id} className="row">
              <div className="grow">
                <strong>{product.name}</strong> <span className="muted">from {peso(product.basePriceCents)}</span>
                <div className="muted">{reason}</div>
              </div>
              <Link className="btn ghost small" to={`/products/${product.id}`}>View</Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Shop({ featured = false }) {
  const online = useOnline();
  const [filters, setFilters] = useState({ q: new URLSearchParams(window.location.search).get('q')?.slice(0, 80) || '', category: '', sort: 'newest', page: 1, minPrice: '', maxPrice: '' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [q, setQuery] = useState(filters.q);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(filters.q), 300);
    return () => clearTimeout(timer);
  }, [filters.q]);
  const qs = new URLSearchParams({ sort: filters.sort, page: String(filters.page), limit: '12', ...(q ? { q } : {}), ...(filters.category ? { category: filters.category } : {}), ...(filters.minPrice ? { minPrice: filters.minPrice } : {}), ...(filters.maxPrice ? { maxPrice: filters.maxPrice } : {}) }).toString();
  const { data, error, loading } = useLoad((signal) => api(`/products?${qs}`, { signal }), [qs, online]);
  const items = data?.data || [];
  const meta = data?.meta;
  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value, page: 1 });

  return (
    <div className={featured ? 'wrap stack home-shop' : 'stack'}>
      <section className="stack" aria-labelledby="catalog-title">
        <div className={featured ? 'catalog-intro featured-intro' : 'catalog-intro'}>
          {featured ? <h2 id="catalog-title">Explore our coffee</h2> : <h1 id="catalog-title">Coffee beans</h1>}
          {featured && <p>Find your next favorite from our Philippine coffee collection.</p>}
        </div>
        <div className="row catalog-tools">
          <div className="field">
            <label htmlFor="q">Search</label>
            <input id="q" maxLength={80} value={filters.q} onChange={set('q')} placeholder="Name, origin, or tasting note" />
          </div>
          <button className="btn ghost" type="button" aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}>Filters</button>
        </div>
        {filterOpen && <div className="filter-sheet panel row">
          <div className="field">
            <label htmlFor="cat">Category</label>
            <select id="cat" value={filters.category} onChange={set('category')}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sort">Sort</label>
            <select id="sort" value={filters.sort} onChange={set('sort')}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price, low to high</option>
              <option value="price_desc">Price, high to low</option>
            </select>
          </div>
          <div className="field"><label htmlFor="min-price">Minimum price (₱)</label><input id="min-price" type="number" min={0} step={1} value={filters.minPrice} onChange={set('minPrice')} /></div>
          <div className="field"><label htmlFor="max-price">Maximum price (₱)</label><input id="max-price" type="number" min={0} step={1} value={filters.maxPrice} onChange={set('maxPrice')} /></div>
          <button className="btn" onClick={() => setFilterOpen(false)}>Done</button>
        </div>}
        {error && <div className="notice error">{error.message}</div>}
        {loading && !items.length && <Skeleton label="Loading beans…" />}
        {!loading && !items.length && !error && <div className="notice">No beans match those filters. Clear the search to see everything.</div>}
        <div className="grid">
          {items.map((product) => <ProductCard key={product.id} product={product} featured={featured} />)}
        </div>
        {meta && meta.total > meta.limit && (
          <div className="row">
            <button className="btn ghost small" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</button>
            <span className="muted">Page {meta.page} of {Math.ceil(meta.total / meta.limit)}</span>
            <button className="btn ghost small" disabled={filters.page * meta.limit >= meta.total} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button>
          </div>
        )}
      </section>
      {featured && <RoastStrip />}
    </div>
  );
}
