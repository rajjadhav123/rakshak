import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import FileUpload from '../components/FileUpload.jsx';
import OcrFirUpload from '../components/OcrFirUpload.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import LastSeenField from '../components/LastSeenField.jsx';
import LocationField from '../components/LocationField.jsx';
import FaceVerifyGate from '../components/FaceVerifyGate.jsx';
import DuplicateWarning from '../components/DuplicateWarning.jsx';
import PhotoQualityCheck from '../components/PhotoQualityCheck.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../roles.js';
import { suggestPriority } from '../utils/priority.js';

const empty = { fullName: '', age: '', height: '', appearanceDescription: '', photoUrl: '', address: '', lat: '', lng: '', lastSeenAt: '', firNumber: '', familyContact: '', state: '', district: '' };

export default function CreateCase() {
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [resolvedArea, setResolvedArea] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [faceGateOpen, setFaceGateOpen] = useState(false);
  const [duplicates, setDuplicates] = useState(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const navigate = useNavigate();

  // Recomputes live as age/last-seen-time change — this is what a
  // "real" system feels like: immediate feedback, not a value that
  // only appears after you submit and reload.
  const livePriority = useMemo(() => suggestPriority({ age: form.age, lastSeenAt: form.lastSeenAt }), [form.age, form.lastSeenAt]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Maps OCR field names to our form's field names and merges in,
  // WITHOUT overwriting anything the officer has already typed.
  const applyOcr = (fields) => {
    setForm((f) => ({
      ...f,
      fullName: f.fullName || fields.fullName || f.fullName,
      age: f.age || fields.age || f.age,
      address: f.address || fields.address || f.address,
      firNumber: f.firNumber || fields.firNumber || f.firNumber,
      familyContact: f.familyContact || fields.contact || f.familyContact,
    }));
  };

  // This is the exact action a stolen Police Admin login would be
  // used to abuse — filing a new "verified" case outright — so it's
  // gated the same as attaching a FIR or verifying a sighting. See
  // backend/routes/caseRoutes.js for the full list of what's gated.
  const proceedPastDuplicateCheck = () => {
    setDuplicates(null);
    if (user.role === ROLES.POLICE_ADMIN) {
      setFaceGateOpen(true);
    } else {
      doSubmit(null);
    }
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
        proceedPastDuplicateCheck();
      }
    } catch (err) {
      // The duplicate check is a heads-up, not a gate — if the check
      // itself fails (network blip, etc.), don't block filing a
      // genuine case over it. Same fail-open reasoning as the
      // eligibility check in EmergencyReport.jsx.
      proceedPastDuplicateCheck();
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const doSubmit = async (faceVerifyNonce) => {
    setError(''); setBusy(true);
    try {
      const { data } = await api.post('/cases', { ...form, faceVerifyNonce });
      navigate(`/cases/${data.case._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create case');
    } finally { setBusy(false); }
  };

  const handleFaceVerified = async (nonce) => {
    setFaceGateOpen(false);
    await doSubmit(nonce);
  };

  return (
    <div>
      {faceGateOpen && <FaceVerifyGate onVerified={handleFaceVerified} onCancel={() => setFaceGateOpen(false)} />}
      <h2>Register Missing Person Case (FIR-anchored)</h2>
      <p className="muted">Restricted to Police Station Admin and above — WORKFLOW-004.</p>

      {duplicates && (
        <DuplicateWarning
          matches={duplicates}
          onCancel={() => setDuplicates(null)}
          onContinue={proceedPastDuplicateCheck}
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
        <LocationField lat={form.lat} lng={form.lng} onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng }))} onResolved={setResolvedArea} label="Last seen — where?" />
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

        <div className="grid grid-2">
          <div>
            <label>State <span className="muted" style={{ fontWeight: 400 }}>(override, optional)</span></label>
            <input value={form.state} onChange={set('state')} placeholder={resolvedArea?.state ? `Auto-detects: ${resolvedArea.state}` : 'Leave blank to auto-detect'} />
          </div>
          <div>
            <label>District <span className="muted" style={{ fontWeight: 400 }}>(override, optional)</span></label>
            <input value={form.district} onChange={set('district')} placeholder={resolvedArea?.district ? `Auto-detects: ${resolvedArea.district}` : 'Leave blank to auto-detect'} />
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
          Leave both blank — the location above already resolves to a jurisdiction. Only fill these in
          if you're certain that auto-detection is wrong; whatever you type here wins over it.
        </p>
        {form.district && resolvedArea?.district && form.district.trim().toLowerCase() !== resolvedArea.district.trim().toLowerCase() && (
          <p style={{ color: 'var(--accent)', fontSize: 12.5, marginTop: -6, marginBottom: 10 }}>
            ⚠️ You've typed "{form.district}", but the location above auto-detects as <strong>{resolvedArea.district}</strong>.
            The case will be filed under what you typed, not the detected district — double-check that's
            what you mean.
          </p>
        )}

        <label>FIR number</label>
        <input required value={form.firNumber} onChange={set('firNumber')} placeholder="e.g. FIR/2026/00123" />
        <label>Family contact (phone)</label>
        <input required value={form.familyContact} onChange={set('familyContact')} />

        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy || checkingDuplicates}>
          {checkingDuplicates ? 'Checking for duplicates…' : busy ? 'Creating…' : 'Create verified case'}
        </button>
      </form>
    </div>
  );
}
