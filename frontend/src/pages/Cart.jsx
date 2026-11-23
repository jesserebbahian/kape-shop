import { Link, useNavigate } from 'react-router-dom';
import { useCart, useOnline } from '../context/StoreContexts.jsx';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { peso, fmtDate, GRIND_LABELS } from '../utils/format.js';

export default function Cart({ checkout = false }) {
  const { items, setItems, refreshCart, cartLoading, cartError } = useCart();
  const online = useOnline();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [form, setForm] = useState({ shippingName: '', shippingPhone: '', shippingAddress: '' });
  const keyRef = useRef(crypto.randomUUID());


  const refreshQuote = async (code, signal) => {
    if (!online || !checkout || !items.length) return setQuote(null);
    try {
      const { data } = await api('/checkout/quote', { method: 'POST', body: code ? { couponCode: code } : {}, signal });
      if (signal?.aborted) return false;
      setQuote(data);
      return true;
    } catch (err) {
      if (!signal?.aborted) setMessage({ kind: 'error', text: err.message });
      return false;
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    refreshQuote(quote?.couponCode || undefined, controller.signal);
    return () => controller.abort();
  }, [items, checkout, online]);

  if (online && cartLoading && !items.length) return <p role="status">Loading your cart…</p>;
  if (online && cartError && !items.length) return <p className="notice error">{cartError}</p>;
  if (!items.length) return <div className="notice">Your cart is empty. <Link to="/products">Pick some beans</Link></div>;

  const changeItem = async (id, quantity) => {
    const previous = items;
    const next = quantity === null ? items.filter((item) => item.cartItemId !== id)
      : items.map((item) => item.cartItemId === id ? { ...item, quantity } : item);
    setEditing(true);
    setMessage(null);
    setItems(next);
    try {
      await api(`/cart/items/${id}`, quantity === null ? { method: 'DELETE' } : { method: 'PATCH', body: { quantity } });
      await refreshCart();
    } catch (err) {
      setItems(previous);
      setMessage({ kind: 'error', text: err.message });
    } finally {
      setEditing(false);
    }
  };

  const applyCoupon = async (e) => {
    e.preventDefault();
    setMessage(null);
    setApplyingCoupon(true);
    if (await refreshQuote(coupon.trim())) setMessage({ kind: 'ok', text: coupon.trim() ? 'Coupon applied.' : 'Coupon cleared.' });
    setApplyingCoupon(false);
  };

  const pay = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const { data } = await api('/checkout', {
        method: 'POST',
        headers: { 'Idempotency-Key': keyRef.current },
        body: { ...form, ...(quote?.couponCode ? { couponCode: quote.couponCode } : {}) }
      });
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else navigate(`/orders/${data.id}`);
    } catch (err) {
      if (err.status && err.code !== 'RATE_LIMITED') keyRef.current = crypto.randomUUID();
      const text = err.code === 'BATCH_FULL' ? 'The open roast batches are full for this order size. Reduce the quantity or check back for the next batch.' : err.message;
      setMessage({ kind: 'error', text });
      setBusy(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="stack">
      <h1>{checkout ? 'Checkout' : 'Your cart'}</h1>
      <section className="stack" aria-label="Cart items">
        {items.map((item) => <article key={item.cartItemId} className="panel row">
          <div className="grow">
            <strong>{item.name}</strong>
            <div className="muted">{item.sizeG} g · {GRIND_LABELS[item.grind]}</div>
            <div>{peso(item.unitPriceCents)} each</div>
          </div>
          <div className="quantity">
            <button className="btn ghost small" type="button" aria-label={`Decrease ${item.name} quantity`} disabled={!online || editing || checkout || item.quantity <= 1} onClick={() => changeItem(item.cartItemId, item.quantity - 1)}>−</button>
            <span>{item.quantity}</span>
            <button className="btn ghost small" type="button" aria-label={`Increase ${item.name} quantity`} disabled={!online || editing || checkout || item.quantity >= 10} onClick={() => changeItem(item.cartItemId, item.quantity + 1)}>+</button>
          </div>
          {!checkout && <button className="btn danger small" disabled={!online || editing} onClick={() => changeItem(item.cartItemId, null)}>Remove</button>}
        </article>)}
      </section>
      {cartError && <p className="notice error">{cartError}</p>}
      {message && <div className={`notice ${message.kind}`} role="status">{message.text}</div>}
      {!checkout && online && <div className="purchase-bar"><Link className="btn" to="/checkout">Checkout</Link></div>}
      {checkout && !online && <p className="notice warn">Reconnect to review totals and pay.</p>}
      {checkout && online && <>
      <form className="panel row" onSubmit={applyCoupon}>
        <div className="field">
          <label htmlFor="coupon">Coupon code</label>
          <input id="coupon" maxLength={30} value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="WELCOME10" />
        </div>
        <button className="btn ghost" disabled={applyingCoupon || busy} style={{ alignSelf: 'end' }}>Apply coupon</button>
      </form>

      {quote && (
        <div className="panel stack">
          <div className="row"><span className="grow">Subtotal</span><span>{peso(quote.subtotalCents)}</span></div>
          {quote.discountCents > 0 && <div className="row"><span className="grow">Discount ({quote.couponCode})</span><span>-{peso(quote.discountCents)}</span></div>}
          <div className="row"><span className="grow">Shipping</span><span>{quote.shippingCents ? peso(quote.shippingCents) : 'Free'}</span></div>
          <div className="row"><strong className="grow">Total</strong><strong>{peso(quote.totalCents)}</strong></div>
          {quote.batch
            ? <div className="notice ok">Your beans will be roasted on {fmtDate(quote.batch.roastDate)}.</div>
            : <div className="notice error">No open roast batch has room for {quote.units} bags. Reduce the quantity to continue.</div>}
        </div>
      )}

      <form className="panel stack" onSubmit={pay}>
        <h3>Delivery details</h3>
        <div className="row">
          <div className="field"><label htmlFor="sn">Full name</label><input id="sn" value={form.shippingName} onChange={set('shippingName')} required minLength={2} maxLength={80} /></div>
          <div className="field"><label htmlFor="sp">Phone</label><input id="sp" type="tel" value={form.shippingPhone} onChange={set('shippingPhone')} required minLength={7} maxLength={20} /></div>
        </div>
        <div><label htmlFor="sa">Address</label><input id="sa" value={form.shippingAddress} onChange={set('shippingAddress')} required minLength={8} maxLength={200} /></div>
        <div className="purchase-bar"><button className="btn" disabled={busy || applyingCoupon || !quote?.batch}>{busy ? 'Opening Maya…' : 'Pay with Maya'}</button></div>
        <p className="muted">Your bags are held for 15 minutes while you pay. You will return here after paying.</p>
      </form>
      </>}
    </div>
  );
}
