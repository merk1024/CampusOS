import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
const COPY = {
  English: { title: 'Audit integrity', verify: 'Verify integrity', busy: 'Verifying...',
    note: 'Independent protection requires a checkpoint retained outside the database. Verification does not repair records.',
    'not-initialized': 'Audit chain has not been initialized.', unanchored: 'Chain is internally consistent, but has no trusted checkpoint.',
    'anchored-prefix-valid': 'Anchored prefix verified. Newer entries remain unanchored.', violation: 'Integrity violation detected. Review the evidence before taking action.',
    unavailable: 'Verification is unavailable. Check the database and checkpoint configuration.', time: 'Verified', baseline: 'Legacy baseline', checkpoint: 'Checkpoint', prefix: 'Anchored entries', tail: 'Unanchored entries' },
  Kyrgyz: { title: 'Журналдын бүтүндүгү', verify: 'Бүтүндүктү текшерүү', busy: 'Текшерилүүдө...',
    note: 'Көз карандысыз коргоо үчүн БДдан тышкары сакталган чекит керек. Текшерүү жазууларды оңдобойт.',
    'not-initialized': 'Журнал чынжыры түзүлгөн эмес.', unanchored: 'Чынжыр туура, бирок ишенимдүү тышкы чекит жок.',
    'anchored-prefix-valid': 'Бекитилген бөлүк текшерилди. Жаңы жазуулар бекитилген эмес.', violation: 'Бүтүндүк бузулган. Далилдерди текшериңиз.',
    unavailable: 'Текшерүү жеткиликсиз. БД жана чекиттин жөндөөлөрүн текшериңиз.', time: 'Текшерилди', baseline: 'Баштапкы тарых', checkpoint: 'Контролдук чекит', prefix: 'Бекитилген жазуулар', tail: 'Бекитилбеген жазуулар' }
};
export default function AuditIntegrityPanel({ language, locale }) {
  const copy = COPY[language] || COPY.English;
  const controller = useRef(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);
  const verify = async () => {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setBusy(true); setResult(null);
    try {
      const data = await api.verifyAuditIntegrity(request.signal);
      if (!request.signal.aborted) setResult(data);
    } catch {
      if (!request.signal.aborted) setResult({ status: 'unavailable' });
    } finally { if (!request.signal.aborted) setBusy(false); }
  };
  return <section className="portal-section-card" aria-label={copy.title} aria-busy={busy}>
    <h2>{copy.title}</h2><p>{copy.note}</p>
    <button type="button" className="btn-secondary" disabled={busy} onClick={verify}>{busy ? copy.busy : copy.verify}</button>
    {result && <div role={result.status === 'violation' ? 'alert' : 'status'}>
      <p><strong>{copy[result.status] || copy.unavailable}</strong></p>
      {result.verifiedAt && <p>{copy.time}: {new Date(result.verifiedAt).toLocaleString(locale)}</p>}
      {result.baselineTime && <p>{copy.baseline}: {new Date(result.baselineTime).toLocaleString(locale)}</p>}
      {result.checkpointTime && <p>{copy.checkpoint}: {new Date(result.checkpointTime).toLocaleString(locale)}</p>}
      {result.anchoredSequence != null && <p>{copy.prefix}: {result.anchoredSequence}</p>}
      {result.tailCount != null && <p>{copy.tail}: {result.tailCount}</p>}
      {result.reference && <p>{result.reference.source} #{result.reference.recordId} · {result.reference.sequence}</p>}
    </div>}
  </section>;
}
