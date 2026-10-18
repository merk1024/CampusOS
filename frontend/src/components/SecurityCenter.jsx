import { useEffect, useState } from 'react';
import { api } from '../api';
import { hasAdminAccess } from '../roles';
import SecurityAlerts from './SecurityAlerts';
import AuditIntegrityPanel from './AuditIntegrityPanel';
import './SecurityCenter.css';

const EMPTY_FILTERS = { source: 'events', q: '', action: '', from: '', to: '' };
const COPY = {
  English: { title: 'Security Center', subtitle: 'Review access events and academic changes.', events: 'Events', grades: 'Grade history', attendance: 'Attendance history', user: 'User name or email', action: 'Action', from: 'From', to: 'To', apply: 'Apply filters', reset: 'Reset', loading: 'Loading audit...', empty: 'No matching records.', time: 'Time', actor: 'Actor', change: 'Event or change', previous: 'Previous', next: 'Next', denied: 'Administrator access required.', failed: 'Could not load audit records.', system: 'System / anonymous', showing: 'Records' },
  Kyrgyz: { title: 'Коопсуздук борбору', subtitle: 'Кирүү окуялары жана академиялык өзгөрүүлөр.', events: 'Окуялар', grades: 'Баалардын тарыхы', attendance: 'Катышуунун тарыхы', user: 'Аты же email', action: 'Аракет', from: 'Башталышы', to: 'Аягы', apply: 'Чыпкалоо', reset: 'Тазалоо', loading: 'Журнал жүктөлүүдө...', empty: 'Жазуулар табылган жок.', time: 'Убакыт', actor: 'Колдонуучу', change: 'Окуя же өзгөрүү', previous: 'Мурунку', next: 'Кийинки', denied: 'Администратордун уруксаты керек.', failed: 'Журнал жүктөлгөн жок.', system: 'Система / белгисиз', showing: 'Жазуулар' }
};

export default function SecurityCenter({ user, language = 'English', locale = 'en-GB' }) {
  const copy = COPY[language] || COPY.English;
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const allowed = hasAdminAccess(user);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    api.getSecurityAudit({ ...filters, offset }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, filters, offset]);
  if (!allowed) return <p role="alert">{copy.denied}</p>;
  const update = event => setDraft({ ...draft, [event.target.name]: event.target.value });
  const load = (nextFilters, nextOffset) => {
    setLoading(true);
    setError('');
    setResult(null);
    setFilters({ ...nextFilters });
    setOffset(nextOffset);
  };
  const entries = result?.entries || [];
  return <section className="security-center">
    <header className="page-header"><h1>{copy.title}</h1><p>{copy.subtitle}</p></header>
    <AuditIntegrityPanel language={language} locale={locale} />
    <SecurityAlerts result={result} loading={loading} language={language} locale={locale} onRefresh={() => load(filters, offset)} />
    <form className="portal-section-card security-filters" onSubmit={event => {
      event.preventDefault(); load(draft, 0);
    }}>
      <label>{copy.title}<select name="source" value={draft.source} onChange={update}>
        <option value="events">{copy.events}</option><option value="grades">{copy.grades}</option><option value="attendance">{copy.attendance}</option>
      </select></label>
      <label>{copy.user}<input name="q" value={draft.q} onChange={update} maxLength={100} /></label>
      <label>{copy.action}<input name="action" value={draft.action} onChange={update} maxLength={60} placeholder="login / access-denied / updated" /></label>
      <label>{copy.from}<input type="date" name="from" value={draft.from} onChange={update} /></label>
      <label>{copy.to}<input type="date" name="to" value={draft.to} min={draft.from || undefined} onChange={update} /></label>
      <div className="portal-actions"><button className="btn-primary" disabled={loading}>{copy.apply}</button>
        <button type="button" className="btn-secondary" onClick={() => { setDraft(EMPTY_FILTERS); load(EMPTY_FILTERS, 0); }}>{copy.reset}</button></div>
    </form>
    {error && <p role="alert">{copy.failed} {error}</p>}
    <div className="portal-section-card" aria-busy={loading}>
      <p role="status">{loading ? copy.loading : entries.length ? `${copy.showing}: ${offset + 1}–${offset + entries.length}` : copy.empty}</p>
      {entries.length > 0 && <div className="data-table-scroll"><table className="data-table">
        <caption className="sr-only">{copy.title}</caption>
        <thead><tr><th scope="col">{copy.time}</th><th scope="col">{copy.actor}</th><th scope="col">{copy.action}</th><th scope="col">{copy.change}</th></tr></thead>
        <tbody>{entries.map(entry => <tr key={entry.id}>
          <td>{new Date(entry.occurredAt).toLocaleString(locale)}</td>
          <td><strong>{entry.actorName || copy.system}</strong><br />{entry.actorEmail}</td>
          <td>{entry.action}</td>
          <td>{entry.summary || `${entry.entity} #${entry.entityId} · ${entry.studentId || ''}`}
            {entry.newValue != null && <div>{entry.previousValue ?? '—'} → {entry.newValue}</div>}
            {(entry.previousComments || entry.newComments) && <div>{entry.previousComments || '—'} → {entry.newComments || '—'}</div>}
          </td>
        </tr>)}</tbody>
      </table></div>}
      <div className="portal-actions"><button className="btn-secondary" disabled={loading || offset === 0} onClick={() => load(filters, Math.max(0, offset - 50))}>{copy.previous}</button>
        <button className="btn-secondary" disabled={loading || !result?.hasMore || offset >= 10000} onClick={() => load(filters, offset + 50)}>{copy.next}</button></div>
    </div>
  </section>;
}
