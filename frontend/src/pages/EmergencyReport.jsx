import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import FileUpload from '../components/FileUpload.jsx';
import OcrFirUpload from '../components/OcrFirUpload.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import LastSeenField from '../components/LastSeenField.jsx';
import LocationField from '../components/LocationField.jsx';
import DuplicateWarning from '../components/DuplicateWarning.jsx';
import PhotoQualityCheck from '../components/PhotoQualityCheck.jsx';
import { suggestPriority } from '../utils/priority.js';

const empty = { fullName: '', age: '', height: '', appearanceDescription: '', photoUrl: '', address: '', lat: '', lng: '', lastSeenAt: '', familyContact: '', declarationAccepted: false };

export default function EmergencyReport() {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [advisory, setAdvisory] = useState('');
  const [busy, setBusy] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [duplicates, setDuplicates] = useState(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/cases/mine')
      .then(({ data }) => setEligibility(data.emergencyReportEligibility))
      .catch(() => {}) // fails open — an unknown eligibility state still lets the form show; the backend enforces the real limit regardless
      .finally(() => setCheckingEligibility(false));
  }, []);

  const livePriority = useMemo(() => suggestPriority({ age: form.age, lastSeenAt: form.lastSeenAt }), [form.age, form.lastSeenAt]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const applyOcr = (fields) => {
    setForm((f) => ({
      ...f,
      fullName: f.fullName || fields.fullName || f.fullName,
      age: f.age || fields.age || f.age,
      address: f.address || fields.address || f.address,
      familyContact: f.familyContact || fields.contact || f.familyContact,
    }));
  };

  const doSubmit = async () => {
    setError(''); setBusy(true);
    try {
      const { data } = await api.post('/cases/emergency', form);
      setAdvisory(data.advisory);
      setTimeout(() => navigate(`/cases/${data.case._id}`), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report');
    } finally { setBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setCheckingDuplicates(true);
    try {
      const { data } = await api.post('/cases/check-duplicates', {
        fullName: form.fullName, age: form.age, lat: form.lat, lng: form.lng, lastSeenAt: form.lastSeenAt,
      });
      if (data.possibleDuplicates.length > 0) {
        setDuplicates(data.possibleDuplicates);
      } else {
        await doSubmit();
      }
    } catch (err) {
      // The duplicate check is a heads-up, not a gate — if the check
      // itself fails, don't block a genuinely urgent report over it.
      await doSubmit();
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const blocked = eligibility && !eligibility.canSubmit;

  if (checkingEligibility) return <p className="muted">Checking eligibility…</p>;

  if (blocked) {
    return (
      <div>
        <h2>Emergency Report</h2>
        <div className="card" style={{ maxWidth: 560 }}>
          <p style={{ marginTop: 0 }}>
            You already submitted an Emergency Report on <strong>{new Date(eligibility.lastSubmittedAt).toDateString()}</strong>.
            To prevent misuse, one report is allowed every 30 days per Family account.
          </p>
          <p>You'll be able to submit another on <strong>{new Date(eligibility.nextEligibleAt).toDateString()}</strong>.</p>
          <p className="muted">
            If this is a genuinely new urgent situation before then, please contact your nearest police station
            directly, or ask them to register the case on your behalf.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Emergency Report</h2>
      <p className="muted">
        For urgent situations before an FIR is filed — WORKFLOW-003. This report has restricted visibility
        until an officer attaches your FIR number. Please also visit or call your nearest police station.
      </p>
      {eligibility?.testAccount && (
        <p className="muted" style={{ color: 'var(--accent)' }}>Demo account — the 30-day submission limit is disabled for testing.</p>
      )}

      {duplicates && (
        <DuplicateWarning
          matches={duplicates}
          onCancel={() => setDuplicates(null)}
          onContinue={() => { setDuplicates(null); doSubmit(); }}
          busy={busy}
        />
      )}

      <OcrFirUpload onExtract={applyOcr} />

      <form className="card" onSubmit={submit} style={{ maxWidth: 640 }}>
        <label>Full name</label>
        <input required value={form.fullName} onChange={set('fullName')} />
        <div className="grid grid-2">
          <div>
            <label>Age</label>
            <input required type="number" min="0" max="120" step="1" value={form.age} onChange={set('age')} />
          </div>
          <div>
            <label>Height (inches)</label>
            <input type="number" min="10" max="100" value={form.height} onChange={set('height')} placeholder="e.g. 66" />
          </div>
        </div>
        <label>Appearance description</label>
        <textarea rows={3} value={form.appearanceDescription} onChange={set('appearanceDescription')} />
        <FileUpload label="Photo (optional)" onUploaded={(url) => setForm((f) => ({ ...f, photoUrl: url }))} />
        {form.photoUrl && <p className="muted" style={{ fontSize: 12 }}>Attached: {form.photoUrl}</p>}
        <PhotoQualityCheck photoUrl={form.photoUrl} />

        <label>Last seen address</label>
        <input required value={form.address} onChange={set('address')} />
        <LocationField lat={form.lat} lng={form.lng} onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng }))} label="Last seen — where?" />
        <LastSeenField value={form.lastSeenAt} onChange={(v) => setForm((f) => ({ ...f, lastSeenAt: v }))} />

        {(form.age || form.lastSeenAt) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0', padding: '8px 10px', background: 'var(--surface-raised)', borderRadius: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>Live assessment:</span>
            <PriorityBadge priority={livePriority.priority} compact />
            {livePriority.reasons.length > 0 && (
              <span className="muted" style={{ fontSize: 11 }}>{livePriority.reasons.join(', ')}</span>
            )}
          </div>
        )}

        <label>Your contact number</label>
        <input required value={form.familyContact} onChange={set('familyContact')} />

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16, padding: 10, background: 'var(--surface-raised)', borderRadius: 6 }}>
          <input
            type="checkbox"
            id="declaration"
            checked={form.declarationAccepted}
            onChange={(e) => setForm({ ...form, declarationAccepted: e.target.checked })}
            style={{ width: 'auto', marginTop: 3 }}
            required
          />
          <label htmlFor="declaration" style={{ margin: 0, fontSize: 12.5, color: 'var(--text)', fontWeight: 400 }}>
            I confirm that the information above is accurate to the best of my knowledge. I understand that
            knowingly submitting false information to a public servant is a punishable offence under
            Section 217 of the Bharatiya Nyaya Sanhita, 2023.
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}
        {advisory && <p className="muted" style={{ color: 'var(--success)' }}>{advisory}</p>}
        <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy || checkingDuplicates || !form.declarationAccepted}>
          {checkingDuplicates ? 'Checking for duplicates…' : busy ? 'Submitting…' : 'Submit emergency report'}
        </button>
      </form>
    </div>
  );
}
