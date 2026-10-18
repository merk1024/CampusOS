import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api, completeMfaUpdate } from '../api';
import MfaRecoveryCodes from './MfaRecoveryCodes';
import './Mfa.css';

const COPY = {
  English: { title: 'Two-factor authentication', password: 'MFA current password', code: 'Authenticator code',
    setup: 'Set up MFA', confirm: 'Confirm MFA', save: 'Codes saved: sign in again', enabled: 'MFA enabled',
    disabled: 'MFA not enabled', keep: 'Save these recovery codes securely. They are shown only once.',
    regen: 'Regenerate recovery codes', disable: 'Disable MFA', proof: 'TOTP or recovery code',
    warning: 'This operation revokes your sessions. Existing recovery codes will no longer work.', cancel: 'Cancel',
    loading: 'Loading MFA status...', working: 'Updating MFA. Please wait...', manual: 'Manual setup key', remaining: 'Recovery codes remaining' },
  Kyrgyz: { title: 'Эки факторлуу аутентификация', password: 'MFA учурдагы сырсөз', code: 'Аутентификатор коду',
    setup: 'MFA орнотуу', confirm: 'MFA ырастоо', save: 'Коддор сакталды: кайра кирүү', enabled: 'MFA күйгүзүлгөн',
    disabled: 'MFA күйгүзүлгөн эмес', keep: 'Калыбына келтирүү коддорун коопсуз сактаңыз. Бир жолу гана көрсөтүлөт.',
    regen: 'Калыбына келтирүү коддорун жаңылоо', disable: 'MFA өчүрүү', proof: 'TOTP же калыбына келтирүү коду',
    warning: 'Сессиялар бүтөт. Мурунку коддор иштебейт.', cancel: 'Жокко чыгаруу',
    loading: 'MFA жүктөлүүдө...', working: 'MFA жаңыртылууда. Күтө туруңуз...', manual: 'Кол менен орнотуу ачкычы', remaining: 'Калган коддор' }
};

export default function MfaSettings({ language = 'English', challenge, onComplete }) {
  const copy = COPY[language] || COPY.English;
  const [status, setStatus] = useState(challenge ? { enabled: false } : null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState(null);
  const [codes, setCodes] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState('');
  useEffect(() => {
    if (challenge) return;
    let active = true;
    api.mfa('status').then(data => { if (active) setStatus(data); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [challenge]);
  const run = async action => {
    setBusy(true); setError('');
    try {
      const body = { ...(challenge ? { challenge } : {}), currentPassword: password,
        ...(/^[a-f0-9]{32}$/.test(code) ? { recoveryCode: code } : { code }) };
      const result = await api.mfa(action, body);
      setPassword(''); setCode('');
      if (action === 'enroll') setSetup({ ...result, qr: await QRCode.toDataURL(result.uri) });
      else if (result.recoveryCodes) { setCodes(result.recoveryCodes); setSetup(null); setOperation(''); }
      else if (result.signedOut) completeMfaUpdate();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <section className="portal-section-card mfa-settings" role="region" aria-label={copy.title}>
    <h3>{copy.title}</h3>
    {error && <p role="alert">{error}</p>}
    {codes || busy ? <MfaRecoveryCodes codes={codes || []} busy={busy} message={codes ? copy.keep : copy.working} buttonLabel={copy.save} onSaved={() => {
      setCodes(null); if (onComplete) onComplete(); completeMfaUpdate();
    }} /> : setup ? <>
      <img src={setup.qr} alt={copy.title} width="200" height="200" />
      <p>{copy.manual}: <code data-testid="mfa-manual-key">{setup.secret}</code></p>
      <label className="exam-form-field">{copy.code}<input value={code} onChange={e => setCode(e.target.value)} autoComplete="one-time-code" inputMode="numeric" maxLength={6} /></label>
      <button type="button" className="btn-primary" disabled={busy} onClick={() => run('confirm')}>{copy.confirm}</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setSetup(null); setCode(''); }}>{copy.cancel}</button>
    </> : !status ? <p>{copy.loading}</p> : <>
      <p>{status.enabled ? copy.enabled : copy.disabled}</p>
      {status.enabled && <p>{copy.remaining}: {status.recoveryCodesRemaining}</p>}
      {(!status.enabled || operation) && <label className="exam-form-field">{copy.password}<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>}
      {!status.enabled ? <button type="button" className="btn-primary" disabled={busy || !password} onClick={() => run('enroll')}>{copy.setup}</button> : operation ? <>
        <p>{copy.warning}</p>
        <label className="exam-form-field">{copy.proof}<input value={code} onChange={e => setCode(e.target.value)} autoComplete="one-time-code" maxLength={32} /></label>
        <button type="button" className="btn-primary" disabled={busy || !code || !password} onClick={() => run(operation)}>{operation === 'regenerate' ? copy.regen : copy.disable}</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setOperation(''); setCode(''); setPassword(''); }}>{copy.cancel}</button>
      </> : <div className="portal-actions">
        <button type="button" className="btn-secondary" onClick={() => setOperation('regenerate')}>{copy.regen}</button>
        <button type="button" className="btn-secondary" onClick={() => setOperation('disable')}>{copy.disable}</button>
      </div>}
    </>}
  </section>;
}
