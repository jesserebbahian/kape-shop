import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { peso, fmtDateTime, GRIND_LABELS, STATUS_LABELS } from '../utils/format.js';
import { useLoad } from '../hooks/useLoad.js';

export const StatusPill = ({ status }) => <span className={`pill ${status}`}>{STATUS_LABELS[status] || status}</span>;

export function OrderList() {
  const { data, error, loading } = useLoad((signal) => api('/orders', { signal }));
  const orders = data?.data || [];
  return (
    <div className="stack">
      <h2>My orders</h2>
      {error && <div className="notice error">{error.message}</div>}
      {loading && <p className="muted">Loading orders…</p>}
      {!loading && !orders.length && <div className="notice">No orders yet. <a href="/">Pick some beans</a></div>}
      <div className="stack">
        {orders.map((o) => (
          <a key={o.id} href={`/orders/${o.id}`} className="panel row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <strong className="grow">Order #{o.id}</strong>
            <StatusPill status={o.status} />
            <span>{peso(o.totalCents)}</span>
            <span className="muted">{fmtDateTime(o.createdAt)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function OrderDetail({ id }) {
  const { data, error, reload } = useLoad((signal) => api(`/orders/${id}`, { signal }), [id]);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);
  const checked = useRef(null);
  const order = data?.data;

  const reconcile = async () => {
    setBusy(true);
    try {
      const { data: result } = await api(`/orders/${id}/reconcile`, { method: 'POST' });
      const text = {
        paid: 'Payment confirmed. Your order is paid.',
        pending: 'Payment has not been completed yet.',
        flagged: 'We received a payment that needs a manual check. The shop has been flagged to review it.',
        cancelled: 'The payment failed and the order was cancelled.',
        failed: 'The payment failed and the order was cancelled.',
        expired: 'The payment session expired.'
      }[result.outcome];
      setNote(text ? { kind: result.outcome === 'paid' ? 'ok' : 'warn', text } : null);
      reload();
    } catch (err) {
      setNote({ kind: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (order && order.status === 'pending_payment' && order.paymentRef && checked.current !== id) {
      checked.current = id;
      reconcile();
    }
  }, [order?.id]);

  const cancel = async () => {
    try {
      await api(`/orders/${id}/cancel`, { method: 'POST' });
      setNote({ kind: 'ok', text: 'Order cancelled and your bags were released.' });
      reload();
    } catch (err) {
      setNote({ kind: 'error', text: err.message });
    }
  };

  if (error) return <div className="notice error">{error.message}. <a href="/orders">Back to orders</a></div>;
  if (!order) return <p className="muted">Loading order…</p>;

  return (
    <div className="stack">
      <div className="row"><h2 className="grow">Order #{order.id}</h2><StatusPill status={order.status} /></div>
      {note && <div className={`notice ${note.kind}`} role="status">{note.text}</div>}
      {order.flagged && <div className="notice warn">This order is under review: {order.flagReason}</div>}
      <div className="panel scroll">
        <table>
          <thead><tr><th>Bean</th><th>Bag</th><th>Qty</th><th>Total</th></tr></thead>
          <tbody>
            {order.items.map((i, n) => (
              <tr key={n}><td>{i.name}<div className="muted">{GRIND_LABELS[i.grind]}</div></td><td>{i.sizeG} g</td><td>{i.quantity}</td><td>{peso(i.lineTotalCents)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '.5rem' }}>
          <span className="muted">Subtotal {peso(order.subtotalCents)}</span>
          {order.discountCents > 0 && <span className="muted">Discount -{peso(order.discountCents)}</span>}
          <span className="muted">Shipping {peso(order.shippingCents)}</span>
          <strong>Total {peso(order.totalCents)}</strong>
        </div>
      </div>
      {order.status === 'pending_payment' && (
        <div className="row">
          {order.checkoutUrl && <a className="btn" href={order.checkoutUrl}>Pay with Maya</a>}
          <button className="btn ghost" disabled={busy} onClick={reconcile}>{busy ? 'Checking…' : 'Check payment status'}</button>
          <button className="btn danger" onClick={cancel}>Cancel order</button>
        </div>
      )}
      <div className="panel">
        <h3>Status history</h3>
        <ul className="timeline">
          {order.history.map((h, n) => (
            <li key={n}><strong>{STATUS_LABELS[h.to] || h.to}</strong> <span className="muted">{fmtDateTime(h.at)}</span>{h.note && <div className="muted">{h.note}</div>}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
