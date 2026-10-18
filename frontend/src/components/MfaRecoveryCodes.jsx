import { useEffect, useRef } from 'react';

export default function MfaRecoveryCodes({ codes, busy, message, buttonLabel, onSaved }) {
  const dialog = useRef(null);
  useEffect(() => { if (!dialog.current.open) dialog.current.showModal(); }, []);
  return <dialog ref={dialog} className="portal-section-card mfa-dialog" aria-label={message} aria-busy={busy} onCancel={event => event.preventDefault()}>
    <p>{message}</p>
    <ul>{codes.map(value => <li key={value}><code data-testid="mfa-recovery-code">{value}</code></li>)}</ul>
    <button type="button" className="btn-primary" disabled={busy} onClick={onSaved}>{buttonLabel}</button>
  </dialog>;
}
