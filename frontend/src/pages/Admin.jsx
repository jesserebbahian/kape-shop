import { useState } from 'react';
import { api } from '../api/client.js';
import { peso, fmtDate, fmtDateTime, STATUS_LABELS } from '../utils/format.js';
import { useLoad } from '../hooks/useLoad.js';
import { StatusPill } from './Orders.jsx';
import CoffeeImage from '../components/CoffeeImage.jsx';

const TABS = ['Dashboard', 'Products', 'Batches', 'Coupons', 'Orders', 'Webhooks'];
const CATEGORIES = ['Single Origin', 'Blend', 'Barako', 'Robusta', 'Specialty'];
const NEXT = { paid: 'roasting', roasting: 'shipped', shipped: 'delivered' };

const Msg = ({ msg }) => (msg ? <div className={`notice ${msg.kind}`} role="status">{msg.text}</div> : null);

const errText = (err) => (err.details?.length ? `${err.details[0].field}: ${err.details[0].message}` : err.message);

function useAction() {
  const [msg, setMsg] = useState(null);
  const run = async (fn, okText, after) => {
    try {
      await fn();
      setMsg({ kind: 'ok', text: okText });
      after?.();
    } catch (err) {
      setMsg({ kind: 'error', text: errText(err) });
    }
  };
  return [msg, run];
}

function Dashboard() {
  const { data, error } = useLoad((signal) => api('/admin/dashboard', { signal }));
  const d = data?.data;
  if (error) return <div className="notice error">{error.message}</div>;
  if (!d) return <p className="muted">Loading…</p>;
  return (
    <div className="stack">
      <div className="stats">
        <div className="panel stat"><b>{d.paidOrders}</b>Paid orders</div>
        <div className="panel stat"><b>{peso(d.grossSalesCents)}</b>Gross sales</div>
        <div className="panel stat"><b>{d.pendingOrders}</b>Awaiting payment</div>
        <div className="panel stat"><b>{d.flaggedOrders}</b>Flagged orders</div>
      </div>
      <div className="panel">
        <h3>Batches with 5 or fewer bags left</h3>
        {d.lowCapacityBatches.length === 0 ? <p className="muted">None. Every open batch has room.</p> : (
          <ul>{d.lowCapacityBatches.map((b) => <li key={b.id}>Batch #{b.id}, roast {fmtDate(b.roastDate)}: {b.remainingUnits} bags left</li>)}</ul>
        )}
      </div>
    </div>
  );
}

const emptyProduct = { name: '', category: 'Single Origin', origin: '', roastLevel: 'medium', tastingNotes: '', description: '', price: '300', imageUrl: '' };

function Products() {
  const { data, reload } = useLoad((signal) => api('/admin/products?limit=50&sort=newest', { signal }));
  const [form, setForm] = useState(emptyProduct);
  const [editId, setEditId] = useState(null);
  const [msg, run] = useAction();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const items = data?.data || [];

  const create = (e) => {
    e.preventDefault();
    const { price, imageUrl, ...rest } = form;
    const body = { ...rest, imageUrl: imageUrl.trim() || null, basePriceCents: Math.round(Number(price) * 100) };
    run(() => api(editId ? `/admin/products/${editId}` : '/admin/products', { method: editId ? 'PATCH' : 'POST', body }),
      editId ? 'Product updated.' : 'Product created.', () => { setEditId(null); setForm(emptyProduct); reload(); });
  };

  return (
    <div className="stack">
      <form className="panel stack" onSubmit={create}>
        <h3>{editId ? 'Edit product' : 'Add a product'}</h3>
        <div className="row">
          <div className="field"><label htmlFor="pn">Name</label><input id="pn" value={form.name} onChange={set('name')} required /></div>
          <div className="field"><label htmlFor="po">Origin</label><input id="po" value={form.origin} onChange={set('origin')} required /></div>
          <div className="field"><label htmlFor="pc">Category</label><select id="pc" value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label htmlFor="pr">Roast</label><select id="pr" value={form.roastLevel} onChange={set('roastLevel')}><option>light</option><option>medium</option><option>dark</option></select></div>
          <div className="field"><label htmlFor="pp">Price per 250 g (₱)</label><input id="pp" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} required /></div>
        </div>
        <div className="row">
          <div className="field"><label htmlFor="pt">Tasting notes</label><input id="pt" value={form.tastingNotes} onChange={set('tastingNotes')} /></div>
          <div className="field"><label htmlFor="pi">Image link (optional)</label><input id="pi" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://..." /></div>
        </div>
        <div><label htmlFor="pd">Description</label><textarea id="pd" maxLength={600} value={form.description} onChange={set('description')} /></div>
        <button className="btn">Save product</button>
        {editId && <button className="btn ghost" type="button" onClick={() => { setEditId(null); setForm(emptyProduct); }}>Cancel edit</button>}
      </form>
      <Msg msg={msg} />
      <div className="panel scroll">
        <table>
          <thead><tr><th /><th>Name</th><th>Category</th><th>From</th><th>Status</th><th /></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td style={{ width: 56 }}><CoffeeImage product={p} size="thumb" /></td><td>{p.name}</td><td>{p.category}</td><td>{peso(p.basePriceCents)}</td><td>{p.active ? 'Active' : 'Hidden'}</td>
                <td className="row">
                  <button className="btn small" onClick={() => {
                    const { name, category, origin, roastLevel, tastingNotes, description, imageUrl, basePriceCents } = p;
                    setEditId(p.id);
                    setForm({ name, category, origin, roastLevel, tastingNotes, description, imageUrl: imageUrl || '', price: String(basePriceCents / 100) });
                    document.getElementById('pn')?.focus();
                  }}>Edit</button>
                  <button className="btn ghost small" onClick={() => run(() => api(`/admin/products/${p.id}`, { method: 'PATCH', body: { active: !p.active } }), p.active ? 'Product hidden.' : 'Product visible.', reload)}>{p.active ? 'Hide' : 'Show'}</button>
                  <button className="btn danger small" onClick={() => run(() => api(`/admin/products/${p.id}`, { method: 'DELETE' }), 'Product deleted.', reload)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Batches() {
  const { data, reload } = useLoad((signal) => api('/admin/batches', { signal }));
  const log = useLoad((signal) => api('/admin/inventory-log', { signal }));
  const [form, setForm] = useState({ roastDate: '', cutoff: '', capacityUnits: 40 });
  const [adjust, setAdjust] = useState({ id: '', delta: 5, reason: '' });
  const [msg, run] = useAction();

  const create = (e) => {
    e.preventDefault();
    run(() => api('/admin/batches', { method: 'POST', body: { roastDate: form.roastDate, cutoffAt: new Date(form.cutoff).toISOString(), capacityUnits: Number(form.capacityUnits) } }), 'Batch created.', reload);
  };
  const doAdjust = (e) => {
    e.preventDefault();
    run(() => api(`/admin/batches/${adjust.id}/adjust`, { method: 'POST', body: { delta: Number(adjust.delta), reason: adjust.reason } }), 'Capacity updated.', () => { reload(); log.reload(); });
  };

  return (
    <div className="stack">
      <form className="panel row" onSubmit={create}>
        <div className="field"><label htmlFor="bd">Roast date</label><input id="bd" type="date" value={form.roastDate} onChange={(e) => setForm({ ...form, roastDate: e.target.value })} required /></div>
        <div className="field"><label htmlFor="bc">Order cut-off</label><input id="bc" type="datetime-local" value={form.cutoff} onChange={(e) => setForm({ ...form, cutoff: e.target.value })} required /></div>
        <div className="field"><label htmlFor="bu">Capacity (bags)</label><input id="bu" type="number" min="1" value={form.capacityUnits} onChange={(e) => setForm({ ...form, capacityUnits: e.target.value })} required /></div>
        <button className="btn" style={{ alignSelf: 'end' }}>Create batch</button>
      </form>
      <form className="panel row" onSubmit={doAdjust}>
        <div className="field"><label htmlFor="ai">Batch</label><select id="ai" value={adjust.id} onChange={(e) => setAdjust({ ...adjust, id: e.target.value })} required><option value="">Choose…</option>{(data?.data || []).map((b) => <option key={b.id} value={b.id}>#{b.id} {fmtDate(b.roastDate)}</option>)}</select></div>
        <div className="field"><label htmlFor="ad">Change (+/-)</label><input id="ad" type="number" value={adjust.delta} onChange={(e) => setAdjust({ ...adjust, delta: e.target.value })} required /></div>
        <div className="field"><label htmlFor="ar">Reason</label><input id="ar" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} required minLength={3} /></div>
        <button className="btn ghost" style={{ alignSelf: 'end' }}>Adjust capacity</button>
      </form>
      <Msg msg={msg} />
      <div className="panel scroll">
        <table>
          <thead><tr><th>#</th><th>Roast</th><th>Cut-off</th><th>Reserved</th><th>Capacity</th></tr></thead>
          <tbody>{(data?.data || []).map((b) => <tr key={b.id}><td>{b.id}</td><td>{fmtDate(b.roastDate)}</td><td>{fmtDateTime(b.cutoffAt)}</td><td>{b.reservedUnits}</td><td>{b.capacityUnits}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="panel scroll">
        <h3>Capacity audit log</h3>
        <table>
          <thead><tr><th>When</th><th>Batch</th><th>Change</th><th>Reason</th></tr></thead>
          <tbody>{(log.data?.data || []).map((l) => <tr key={l.id}><td>{fmtDateTime(l.created_at)}</td><td>#{l.batch_id}</td><td>{l.previous_units} to {l.new_units}</td><td>{l.reason}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function Coupons() {
  const { data, reload } = useLoad((signal) => api('/admin/coupons', { signal }));
  const [form, setForm] = useState({ code: '', type: 'percent', value: 10, minSpend: 0, usageLimit: '' });
  const [msg, run] = useAction();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = (e) => {
    e.preventDefault();
    const value = form.type === 'fixed' ? Math.round(Number(form.value) * 100) : Number(form.value);
    run(() => api('/admin/coupons', { method: 'POST', body: { code: form.code, type: form.type, value, minSpendCents: Math.round(Number(form.minSpend) * 100), usageLimit: form.usageLimit ? Number(form.usageLimit) : null, perCustomerLimit: 1, active: true } }), 'Coupon created.', reload);
  };

  return (
    <div className="stack">
      <form className="panel row" onSubmit={create}>
        <div className="field"><label htmlFor="cc">Code</label><input id="cc" value={form.code} onChange={set('code')} required /></div>
        <div className="field"><label htmlFor="ct">Type</label><select id="ct" value={form.type} onChange={set('type')}><option value="percent">Percent off</option><option value="fixed">Fixed pesos off</option></select></div>
        <div className="field"><label htmlFor="cv">Value</label><input id="cv" type="number" min="1" value={form.value} onChange={set('value')} required /></div>
        <div className="field"><label htmlFor="cm">Minimum spend (₱)</label><input id="cm" type="number" min="0" value={form.minSpend} onChange={set('minSpend')} /></div>
        <div className="field"><label htmlFor="cu">Usage limit</label><input id="cu" type="number" min="1" value={form.usageLimit} onChange={set('usageLimit')} placeholder="Unlimited" /></div>
        <button className="btn" style={{ alignSelf: 'end' }}>Create coupon</button>
      </form>
      <Msg msg={msg} />
      <div className="panel scroll">
        <table>
          <thead><tr><th>Code</th><th>Discount</th><th>Minimum</th><th>Used</th><th>Expires</th><th /></tr></thead>
          <tbody>
            {(data?.data || []).map((c) => (
              <tr key={c.code}>
                <td>{c.code}</td>
                <td>{c.type === 'percent' ? `${c.value}%` : peso(c.value)}</td>
                <td>{peso(c.minSpendCents)}</td>
                <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                <td>{c.expiresAt ? fmtDate(c.expiresAt) : 'Never'}</td>
                <td><button className="btn ghost small" onClick={() => run(() => api(`/admin/coupons/${c.code}`, { method: 'PATCH', body: { active: !c.active } }), c.active ? 'Coupon deactivated.' : 'Coupon activated.', reload)}>{c.active ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Orders() {
  const [status, setStatus] = useState('');
  const [dates, setDates] = useState({ from: '', to: '' });
  const query = new URLSearchParams({ limit: '50' });
  if (status) query.set('status', status);
  if (dates.from) query.set('from', new Date(`${dates.from}T00:00:00`).toISOString());
  if (dates.to) query.set('to', new Date(`${dates.to}T23:59:59.999`).toISOString());
  const { data, error, reload } = useLoad((signal) => api(`/admin/orders?${query}`, { signal }), [query.toString()]);
  const [msg, run] = useAction();
  return (
    <div className="stack">
      <div className="row">
        <div className="field"><label htmlFor="os">Status</label>
          <select id="os" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="of">From</label><input id="of" type="date" value={dates.from} max={dates.to || undefined} onChange={(event) => setDates({ ...dates, from: event.target.value })} /></div>
        <div className="field"><label htmlFor="ot">To</label><input id="ot" type="date" value={dates.to} min={dates.from || undefined} onChange={(event) => setDates({ ...dates, to: event.target.value })} /></div>
      </div>
      {error && <p className="notice error">{error.message}</p>}
      <Msg msg={msg} />
      <div className="panel scroll">
        <table>
          <thead><tr><th>#</th><th>Customer</th><th>Status</th><th>Total</th><th>Batch</th><th>Actions</th></tr></thead>
          <tbody>
            {(data?.data || []).map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.customerEmail}{o.flagged && <div className="muted">Flagged: {o.flagReason}</div>}</td>
                <td><StatusPill status={o.status} /></td>
                <td>{peso(o.totalCents)}</td>
                <td>#{o.batchId}</td>
                <td className="row">
                  {NEXT[o.status] && <button className="btn small" onClick={() => run(() => api(`/admin/orders/${o.id}/status`, { method: 'PATCH', body: { status: NEXT[o.status] } }), `Order #${o.id} is now ${NEXT[o.status]}.`, reload)}>Mark {NEXT[o.status]}</button>}
                  {o.status === 'pending_payment' && <button className="btn ghost small" onClick={() => run(() => api(`/admin/orders/${o.id}/reconcile`, { method: 'POST' }), `Checked payment for order #${o.id}.`, reload)}>Check payment</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Webhooks() {
  const { data } = useLoad((signal) => api('/admin/webhook-events', { signal }));
  const rows = data?.data || [];
  return (
    <div className="panel scroll">
      {rows.length === 0 && <p className="muted">No webhook events received yet.</p>}
      {rows.length > 0 && (
        <table>
          <thead><tr><th>Received</th><th>Provider</th><th>Type</th><th>Event id</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.event_id}><td>{fmtDateTime(r.created_at)}</td><td>{r.provider}</td><td>{r.type}</td><td>{r.event_id}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}

const VIEWS = { Dashboard, Products, Batches, Coupons, Orders, Webhooks };

export default function Admin() {
  const [tab, setTab] = useState('Dashboard');
  const View = VIEWS[tab];
  return (
    <div className="stack">
      <h2>Shop admin</h2>
      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      <View />
    </div>
  );
}
