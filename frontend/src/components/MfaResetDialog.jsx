import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import './Mfa.css';

export default function MfaResetDialog({ target, language, onClose }) {
  const dialog = useRef(null);
  const [password, setPassword] = useState('');
  const [proof, setProof] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ky = language === 'Kyrgyz';
  useEffect(() => { dialog.current.showModal(); }, []);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api.mfa('reset', { targetId: target.id, currentPassword: password,
        ...(/^[a-f0-9]{32}$/.test(proof) ? { recoveryCode: proof } : { code: proof }) });
      onClose();
    } catch (err) { setError(err.message); setBusy(false); }
  };
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="mfa-reset-title" className="portal-section-card mfa-dialog">
    <form onSubmit={submit}>
      <h3 id="mfa-reset-title">{ky ? 'MFA калыбына келтирүү' : 'Reset administrator MFA'}</h3>
      <p>{target.email}</p>
      <p>{ky ? 'Колдонуучунун сессиялары бүтөт. Өзүңүздүн сырсөз жана MFA кодуңуз керек.' : 'This revokes the target account sessions. Your own password and MFA proof are required.'}</p>
      {error && <p role="alert">{error}</p>}
      <label className="exam-form-field">{ky ? 'Сиздин сырсөз' : 'Your current password'}<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      <label className="exam-form-field">{ky ? 'Сиздин MFA коду' : 'Your MFA or recovery code'}<input autoComplete="one-time-code" value={proof} onChange={e => setProof(e.target.value)} maxLength={32} required /></label>
      <div className="portal-actions"><button className="btn-primary" disabled={busy}>{ky ? 'Ырастоо' : 'Confirm reset'}</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>{ky ? 'Жокко чыгаруу' : 'Cancel'}</button></div>
    </form>
  </dialog>;
}
