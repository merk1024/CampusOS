const COPY = {
  English: {
    title: 'Security alerts', refresh: 'Refresh alerts', empty: 'No rules triggered in the last 10 minutes.',
    note: 'Warnings require review; accounts are not blocked automatically. Refresh to update.',
    failed: 'Repeated failed logins', denied: 'Repeated access denials', mfa: 'Repeated MFA failures',
    anonymous: 'Unknown accounts (combined activity, not a single person)',
    count: 'Events / threshold', last: 'Last event', checked: 'Checked', more: 'Only the first 100 warnings are shown.'
  },
  Kyrgyz: {
    title: 'Коопсуздук эскертүүлөрү', refresh: 'Эскертүүлөрдү жаңыртуу', empty: 'Акыркы 10 мүнөттө эскертүү жок.',
    note: 'Эскертүүлөрдү текшерүү керек; аккаунттар автоматтык бөгөттөлбөйт. Жаңыртуу баскычын басыңыз.',
    failed: 'Кайталанган ийгиликсиз кирүүлөр', denied: 'Кайталанган уруксат бербөө', mfa: 'Кайталанган MFA каталары',
    anonymous: 'Белгисиз аккаунттар (жалпы аракеттер, бир адам эмес)',
    count: 'Окуялар / чек', last: 'Акыркы окуя', checked: 'Текшерилди', more: 'Алгачкы 100 эскертүү гана көрсөтүлөт.'
  }
};

export default function SecurityAlerts({ result, loading, language, locale, onRefresh }) {
  const copy = COPY[language] || COPY.English;
  return <section className="portal-section-card security-alerts" aria-labelledby="security-alerts-title" aria-busy={loading}>
    <div className="security-alerts-header">
      <h2 id="security-alerts-title">{copy.title}</h2>
      <button type="button" className="btn-secondary" disabled={loading} onClick={onRefresh}>{copy.refresh}</button>
    </div>
    <p>{copy.note}</p>
    {result && <>
      <p className="security-alerts-meta">{copy.checked}: {new Date(result.evaluatedAt).toLocaleString(locale)}</p>
      {result.alerts?.length ? <ul className="security-alerts-list">{result.alerts.map(alert => <li key={alert.id}>
        <h3>{alert.rule === 'failed-logins' ? copy.failed : alert.rule === 'failed-mfa' ? copy.mfa : copy.denied}</h3>
        <p>{alert.scope === 'anonymous-aggregate' ? copy.anonymous : alert.actorName || alert.actorEmail || `#${alert.actorId}`}</p>
        {alert.scope === 'account' && alert.actorEmail && <p>{alert.actorEmail}</p>}
        <p>{copy.count}: <strong>{alert.count} / {alert.threshold}</strong> · {alert.windowMinutes} min</p>
        <p>{copy.last}: {new Date(alert.lastSeen).toLocaleString(locale)}</p>
        {alert.requestId && <p className="security-alerts-meta">Request ID: {alert.requestId}</p>}
      </li>)}</ul> : <p>{copy.empty}</p>}
      {result.alertsHasMore && <p>{copy.more}</p>}
    </>}
  </section>;
}
