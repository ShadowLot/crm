import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, inr, STAGE_LABELS, STATUS_LABELS, TYPE_LABELS } from '../api.js';

const today = new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/api/dashboard').then(setData).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const { totals, salesByStage, customersByStatus, upcoming, recentCustomers } = data;
  const maxStage = Math.max(1, ...salesByStage.map((d) => d.count));

  return (
    <>
      <div className="page-head"><h1>Dashboard</h1><span className="muted">{new Date().toDateString()}</span></div>

      <div className="grid stats" style={{ marginBottom: 18 }}>
        <Stat label="Total customers" value={totals.customers} />
        <Stat label="Converted" value={totals.converted} cls="good" />
        <Stat label="Open sales" value={totals.openSales} />
        <Stat label="Pipeline value" value={inr(totals.pipelineValue)} />
        <Stat label="Won this period" value={inr(totals.wonValue)} cls="good" />
        <Stat label="Overdue follow-ups" value={totals.overdue} cls={totals.overdue ? 'warn' : ''} />
      </div>

      <div className="grid two">
        <div className="card">
          <h2>Sales by stage</h2>
          {Object.keys(STAGE_LABELS).map((s) => {
            const row = salesByStage.find((d) => d.stage === s) || { count: 0, value: 0 };
            return (
              <div key={s} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{STAGE_LABELS[s]}</span>
                  <span className="muted">{row.count} · {inr(row.value)}</span>
                </div>
                <div className="bar"><div style={{ width: `${(row.count / maxStage) * 100}%` }} /></div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h2>Upcoming follow-ups</h2>
          {upcoming.length === 0 && <p className="muted">Nothing scheduled.</p>}
          {upcoming.map((a) => (
            <div className="list-item" key={a.id}>
              <div>
                <span className={`badge ${a.type}`}>{TYPE_LABELS[a.type]}</span> {a.subject}
                <div className="sub">{a.customer_name}</div>
              </div>
              <span className={a.due_date < today ? 'overdue' : 'muted'}>{a.due_date}</span>
            </div>
          ))}
          <div style={{ marginTop: 10 }}><Link to="/activities" className="muted">View all →</Link></div>
        </div>

        <div className="card">
          <h2>Customers by status</h2>
          {Object.keys(STATUS_LABELS).map((s) => (
            <div className="list-item" key={s}>
              <span className={`badge ${s}`}>{STATUS_LABELS[s]}</span>
              <strong>{customersByStatus.find((c) => c.status === s)?.count ?? 0}</strong>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Recently added customers</h2>
          {recentCustomers.map((c) => (
            <div className="list-item" key={c.id}>
              <div>{c.name}<div className="sub">{c.company || '—'}</div></div>
              <span className={`badge ${c.status}`}>{STATUS_LABELS[c.status]}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, cls = '' }) {
  return (
    <div className={`card stat ${cls}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
