import { useCallback, useEffect, useState } from 'react';
import { api, inr, STAGE_LABELS } from '../api.js';
import Modal from '../components/Modal.jsx';

const stages = Object.keys(STAGE_LABELS);
const empty = { customer_id: '', title: '', value: '', stage: 'new', expected_close: '' };

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([api.get('/api/sales'), api.get('/api/customers')])
      .then(([d, c]) => { setSales(d); setCustomers(c); })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const move = async (sale, stage) => {
    await api.patch(`/api/sales/${sale.id}/stage`, { stage });
    load();
  };
  const remove = async (sale) => {
    if (!window.confirm(`Delete sale "${sale.title}"?`)) return;
    await api.del(`/api/sales/${sale.id}`);
    load();
  };

  return (
    <>
      <div className="page-head">
        <h1>Sales pipeline</h1>
        <button className="primary" onClick={() => setEditing({ ...empty })}>+ New sale</button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="board">
        {stages.map((s) => {
          const items = sales.filter((d) => d.stage === s);
          const total = items.reduce((sum, d) => sum + d.value, 0);
          return (
            <div className="column" key={s}>
              <h3>{STAGE_LABELS[s]}</h3>
              <div className="total">{items.length} sales · {inr(total)}</div>
              {items.map((d) => (
                <div className="sale-card" key={d.id}>
                  <div className="title">{d.title}</div>
                  <div className="meta">{d.customer_name}{d.customer_company ? ` · ${d.customer_company}` : ''}</div>
                  <div className="value">{inr(d.value)}</div>
                  {d.expected_close && <div className="meta">Close by {d.expected_close}</div>}
                  <select value={d.stage} onChange={(e) => move(d, e.target.value)} aria-label="Move to stage">
                    {stages.map((st) => <option key={st} value={st}>{STAGE_LABELS[st]}</option>)}
                  </select>
                  <div className="row">
                    <button className="small" onClick={() => setEditing(d)}>Edit</button>
                    <button className="small danger" onClick={() => remove(d)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {editing && (
        <SaleForm initial={editing} customers={customers} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </>
  );
}

function SaleForm({ initial, customers, onClose, onSaved }) {
  const [form, setForm] = useState({ ...empty, ...initial, customer_id: initial.customer_id || customers[0]?.id || '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const body = {
      customer_id: Number(form.customer_id),
      title: form.title,
      value: Number(form.value) || 0,
      stage: form.stage,
      expected_close: form.expected_close || '',
    };
    try {
      if (initial.id) await api.put(`/api/sales/${initial.id}`, body);
      else await api.post('/api/sales', body);
      onSaved();
    } catch (err) { setError(err.message); }
  };

  return (
    <Modal title={initial.id ? 'Edit sale' : 'New sale'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="full"><label>Title *</label><input value={form.title} onChange={set('title')} required maxLength={120} /></div>
          <div>
            <label>Customer *</label>
            <select value={form.customer_id} onChange={set('customer_id')} required>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
            </select>
          </div>
          <div><label>Value (INR)</label><input type="number" min="0" step="1" value={form.value} onChange={set('value')} /></div>
          <div>
            <label>Stage</label>
            <select value={form.stage} onChange={set('stage')}>
              {stages.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </div>
          <div><label>Expected close</label><input type="date" value={form.expected_close || ''} onChange={set('expected_close')} /></div>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}
