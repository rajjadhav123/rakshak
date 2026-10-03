import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import StatusPill from '../components/StatusPill.jsx';
import CaseProgress from '../components/CaseProgress.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import FileUpload from '../components/FileUpload.jsx';
import SightingMap from '../components/SightingMap.jsx';
import LocationField from '../components/LocationField.jsx';
import FaceVerifyGate from '../components/FaceVerifyGate.jsx';
import DocumentsPanel from '../components/DocumentsPanel.jsx';
import AdditionalInfoPanel from '../components/AdditionalInfoPanel.jsx';
import PhotosPanel from '../components/PhotosPanel.jsx';
import { CAN_VERIFY, CAN_CREATE_CASE, CAN_REASSIGN_STATION, CAN_CLOSE_WITHOUT_FINDING, ADMIN_ROLES, ROLES, ROLE_LABELS } from '../roles.js';
import { formatHeight } from '../utils/height.js';

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [sightingForm, setSightingForm] = useState({ description: '', address: '', lat: '', lng: '', evidenceUrls: [] });
  const [firInput, setFirInput] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  const [myVolunteers, setMyVolunteers] = useState([]);
  const [assignVolunteerId, setAssignVolunteerId] = useState('');
  const [fieldUpdateNote, setFieldUpdateNote] = useState('');

  const [stations, setStations] = useState([]);
  const [reassignTarget, setReassignTarget] = useState('');
  const [showPriorityEdit, setShowPriorityEdit] = useState(false);
  const [priorityOverride, setPriorityOverride] = useState('');
  const [priorityReason, setPriorityReason] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [showCloseWithoutFinding, setShowCloseWithoutFinding] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [closureNote, setClosureNote] = useState('');
  const [suspendReporter, setSuspendReporter] = useState(false);
  const [closeError, setCloseError] = useState('');
  const [faceGate, setFaceGate] = useState(null); // { type: 'attachFir' } | { type: 'sighting', sightingId, decision }

  const canVerify = CAN_VERIFY.includes(user.role);
  const canAttachFir = CAN_CREATE_CASE.includes(user.role);
  const canEdit = CAN_VERIFY.includes(user.role);
  const canSubmitSighting = [ROLES.CITIZEN, ROLES.NGO_VOLUNTEER, ROLES.NGO_ADMIN, ROLES.FAMILY].includes(user.role);
  const canReassignStation = CAN_REASSIGN_STATION.includes(user.role);
  const canCloseWithoutFinding = CAN_CLOSE_WITHOUT_FINDING.includes(user.role);
  // Case Material: the reporting family, or any official whose
  // jurisdiction covers this case (backend enforces the same rule —
  // see caseController.canAddToCase). Citizens/NGOs/volunteers get
  // read-only visibility rather than none, since this data (a
  // distinguishing mark, a document) can matter to anyone actively
  // helping search, not only the two parties who can add to it.
  const [materialTab, setMaterialTab] = useState('Documents');
  const canContributeCaseMaterial = caseData && (String(caseData.createdBy?._id || caseData.createdBy) === String(user._id) || ADMIN_ROLES.includes(user.role));

  const load = async () => {
    setLoadError('');
    try {
      const [caseRes, sightingRes] = await Promise.all([
        api.get(`/cases/${id}`),
        api.get('/sightings', { params: { caseId: id } }),
      ]);
      setCaseData(caseRes.data.case);
      setSightings(sightingRes.data.sightings);
    } catch (err) {
      // Only takes over the page if we've never successfully loaded
      // (see the render gate below) — a refresh after an action
      // failing shouldn't blow away an already-rendered case.
      setLoadError(err.response?.data?.message || 'Failed to load this case');
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  useEffect(() => {
    if (user.role === ROLES.NGO_ADMIN) {
      api.get('/users').then(({ data }) => setMyVolunteers(data.users)).catch(() => {});
    }
    if (canReassignStation) {
      api.get('/stations').then(({ data }) => setStations(data.stations)).catch(() => {});
    }
  }, []); // eslint-disable-line

  const loadVersions = async () => {
    const { data } = await api.get(`/cases/${id}/versions`);
    setVersions(data.versions);
    setShowVersions(true);
  };

  const submitSighting = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.post('/sightings', { caseId: id, ...sightingForm });
      setSightingForm({ description: '', address: '', lat: '', lng: '', evidenceUrls: [] });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit sighting');
    } finally { setBusy(false); }
  };

  const verifySighting = async (sightingId, decision) => {
    if (user.role === ROLES.POLICE_ADMIN) {
      setFaceGate({ type: 'sighting', sightingId, decision });
      return;
    }
    await doVerifySighting(sightingId, decision, null);
  };

  const doVerifySighting = async (sightingId, decision, faceVerifyNonce) => {
    try {
      await api.patch(`/sightings/${sightingId}/verify`, { decision, faceVerifyNonce });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record this decision');
    }
  };

  const updateStatus = async (status, extra = {}) => {
    if (user.role === ROLES.POLICE_ADMIN) {
      setFaceGate({ type: 'status', status, extra });
      return;
    }
    await doUpdateStatus(status, extra, null);
  };

  const doUpdateStatus = async (status, extra, faceVerifyNonce) => {
    setCloseError('');
    try {
      const { data } = await api.patch(`/cases/${id}/status`, { status, ...extra, faceVerifyNonce });
      setShowCloseWithoutFinding(false);
      setClosureReason('');
      setClosureNote('');
      setSuspendReporter(false);
      await load();
      if (data.suspendedReporter) alert('The reporting account has been suspended.');
    } catch (err) {
      setCloseError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const submitCloseWithoutFinding = async (e) => {
    e.preventDefault();
    if (!closureReason) return;
    await updateStatus('closed', { closureReason, note: closureNote, suspendReporter });
  };

  const updatePriority = async (e) => {
    e.preventDefault();
    if (!priorityOverride) return;
    // Deliberately NOT face-gated — see routes/caseRoutes.js for why:
    // this is routine triage, not an assertion about the case's truth.
    await api.patch(`/cases/${id}/priority`, { priority: priorityOverride, reason: priorityReason });
    setShowPriorityEdit(false);
    setPriorityOverride('');
    setPriorityReason('');
    await load();
  };

  const attachFir = async (e) => {
    e.preventDefault();
    if (user.role === ROLES.POLICE_ADMIN) {
      setFaceGate({ type: 'attachFir' });
      return;
    }
    await doAttachFir(null);
  };

  const doAttachFir = async (faceVerifyNonce) => {
    setError('');
    try {
      await api.patch(`/cases/${id}/attach-fir`, { firNumber: firInput, faceVerifyNonce });
      setFirInput('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to attach FIR');
    }
  };

  const handleFaceVerified = async (nonce) => {
    const action = faceGate;
    setFaceGate(null);
    if (!action) return;
    if (action.type === 'attachFir') await doAttachFir(nonce);
    else if (action.type === 'sighting') await doVerifySighting(action.sightingId, action.decision, nonce);
    else if (action.type === 'status') await doUpdateStatus(action.status, action.extra, nonce);
    else if (action.type === 'edit') await doSaveEdit(nonce);
    else if (action.type === 'restore') await doRestoreVersion(action.versionId, nonce);
  };

  const startEdit = () => {
    setEditForm({
      fullName: caseData.fullName, age: caseData.age, height: caseData.height || '',
      appearanceDescription: caseData.appearanceDescription || '', photoUrl: caseData.photoUrl || '',
      familyContact: caseData.familyContact, changeReason: '',
    });
    setEditMode(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (user.role === ROLES.POLICE_ADMIN) {
      setFaceGate({ type: 'edit' });
      return;
    }
    await doSaveEdit(null);
  };

  const doSaveEdit = async (faceVerifyNonce) => {
    await api.patch(`/cases/${id}`, { ...editForm, faceVerifyNonce });
    setEditMode(false);
    await load();
  };

  const restoreVersion = async (versionId) => {
    if (!confirm('Restore case to this earlier version? The current state will be saved as a new version first.')) return;
    if (user.role === ROLES.POLICE_ADMIN) {
      setFaceGate({ type: 'restore', versionId });
      return;
    }
    await doRestoreVersion(versionId, null);
  };

  const doRestoreVersion = async (versionId, faceVerifyNonce) => {
    await api.post(`/cases/${id}/versions/${versionId}/restore`, { faceVerifyNonce });
    await load();
    await loadVersions();
  };

  const assignVolunteer = async (e) => {
    e.preventDefault();
    if (!assignVolunteerId) return;
    try {
      await api.post(`/cases/${id}/assign-volunteer`, { volunteerId: assignVolunteerId });
      setAssignVolunteerId('');
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign volunteer');
    }
  };

  const postFieldUpdate = async (e) => {
    e.preventDefault();
    if (!fieldUpdateNote.trim()) return;
    await api.post(`/cases/${id}/field-update`, { note: fieldUpdateNote });
    setFieldUpdateNote('');
    await load();
  };

  const reassignStation = async (e) => {
    e.preventDefault();
    if (!reassignTarget) return;
    await api.patch(`/cases/${id}/reassign-station`, { policeStationId: reassignTarget, reason: reassignReason });
    setReassignTarget(''); setReassignReason('');
    await load();
  };

  if (loadError && !caseData) {
    return (
      <div>
        <p className="error-text">{loadError}</p>
        <button className="btn btn-outline" onClick={load}>Retry</button>
      </div>
    );
  }
  if (!caseData) return <p className="muted">Loading…</p>;

  const isInvolvedNgoAdmin = user.role === ROLES.NGO_ADMIN && caseData.involvedNgos?.some((n) => n.ngoAdmin?._id === user._id);
  const isAssignedVolunteer = user.role === ROLES.NGO_VOLUNTEER && caseData.assignedVolunteers?.some((a) => a.volunteer?._id === user._id);

  return (
    <div>
      {faceGate && <FaceVerifyGate onVerified={handleFaceVerified} onCancel={() => setFaceGate(null)} />}
      <div className="topbar">
        <div>
          <h2>{caseData.fullName}</h2>
          <p className="case-id">Case ID: {caseData._id} {caseData.firNumber && `· FIR ${caseData.firNumber}`}</p>
          {caseData.createdBy && (
            <p className="muted" style={{ marginTop: 4 }}>
              Originally reported by <strong>{caseData.createdBy.name}</strong> ({ROLE_LABELS[caseData.createdBy.role] || caseData.createdBy.role})
              {caseData.verifiedBy && <> · Verified by <strong>{caseData.verifiedBy.name}</strong></>}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <PriorityBadge priority={caseData.priority} resolved={['found', 'closed'].includes(caseData.status)} />
          <StatusPill status={caseData.status} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <strong style={{ fontSize: 14 }}>Registration Details</strong>
        <div className="grid grid-2" style={{ marginTop: 10, gap: '10px 20px', fontSize: 13.5 }}>
          <div>
            <span className="muted" style={{ fontSize: 12 }}>Filed as</span>
            <p style={{ margin: '2px 0 0' }}>
              {caseData.isEmergencyReport
                ? 'Emergency Report (pre-FIR)'
                : `Official case${caseData.firNumber ? ` — FIR ${caseData.firNumber}` : ''}`}
            </p>
          </div>
          <div>
            <span className="muted" style={{ fontSize: 12 }}>Filed by</span>
            <p style={{ margin: '2px 0 0' }}>
              {caseData.createdBy?.name || 'Unknown'} {caseData.createdBy?.role && `(${ROLE_LABELS[caseData.createdBy.role] || caseData.createdBy.role})`}
            </p>
          </div>
          <div>
            <span className="muted" style={{ fontSize: 12 }}>Filed on</span>
            <p style={{ margin: '2px 0 0' }}>{new Date(caseData.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <span className="muted" style={{ fontSize: 12 }}>Assigned jurisdiction</span>
            <p style={{ margin: '2px 0 0' }}>
              {caseData.policeStationId?.name || 'Not yet assigned to a station'}
              {caseData.jurisdiction?.district && <>, {caseData.jurisdiction.district}</>}
            </p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span className="muted" style={{ fontSize: 12 }}>Last seen location (as reported)</span>
            <p style={{ margin: '2px 0 0' }}>{caseData.lastSeenLocation?.address || 'No address recorded'}</p>
          </div>
          {caseData.verifiedBy && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span className="muted" style={{ fontSize: 12 }}>Verified by</span>
              <p style={{ margin: '2px 0 0' }}>{caseData.verifiedBy.name} ({ROLE_LABELS[caseData.verifiedBy.role] || caseData.verifiedBy.role})</p>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, paddingTop: 20, paddingBottom: 14 }}>
        <CaseProgress status={caseData.status} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="topbar" style={{ marginBottom: 4 }}>
          <div>
            <strong style={{ fontSize: 14 }}>Case Assessment</strong>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              {caseData.priorityAutoSuggested ? 'Auto-suggested: ' : 'Manually set: '}{caseData.priorityReason || 'No assessment recorded'}
            </p>
          </div>
          {canVerify && !showPriorityEdit && (
            <button className="btn btn-outline" onClick={() => { setShowPriorityEdit(true); setPriorityOverride(caseData.priority); }}>Review priority</button>
          )}
        </div>

        {showPriorityEdit && (
          <form onSubmit={updatePriority} style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <label>Priority level</label>
            <select value={priorityOverride} onChange={(e) => setPriorityOverride(e.target.value)}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <label>Reason (optional, recorded in history)</label>
            <input value={priorityReason} onChange={(e) => setPriorityReason(e.target.value)} placeholder="e.g. Family reports history of medical condition" />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-primary">Save priority</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowPriorityEdit(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="topbar" style={{ marginBottom: 4 }}>
            <h3 style={{ margin: 0 }}>Details</h3>
            {canEdit && !editMode && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" onClick={startEdit}>Edit</button>
                <button className="btn btn-outline" onClick={loadVersions}>History</button>
              </div>
            )}
          </div>

          {!editMode ? (
            <>
              <p><strong>Age:</strong> {caseData.age} &nbsp; <strong>Height:</strong> {formatHeight(caseData.height)}</p>
              <p><strong>Description:</strong> {caseData.appearanceDescription || '—'}</p>
              {caseData.photoUrl && <img src={caseData.photoUrl} alt={caseData.fullName} style={{ maxWidth: '100%', borderRadius: 6, marginBottom: 10 }} />}
              <p><strong>Last seen:</strong> {caseData.lastSeenLocation?.address} on {new Date(caseData.lastSeenAt).toLocaleString()}</p>
              <p><strong>Family contact:</strong> {caseData.familyContact}</p>
            </>
          ) : (
            <form onSubmit={saveEdit}>
              <label>Full name</label>
              <input required value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
              <div className="grid grid-2">
                <div><label>Age</label><input required type="number" min="0" max="120" step="1" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} /></div>
                <div><label>Height (inches)</label><input type="number" min="10" max="100" value={editForm.height} onChange={(e) => setEditForm({ ...editForm, height: e.target.value })} /></div>
              </div>
              <label>Appearance description</label>
              <textarea rows={3} value={editForm.appearanceDescription} onChange={(e) => setEditForm({ ...editForm, appearanceDescription: e.target.value })} />
              <FileUpload label="Replace photo (optional)" onUploaded={(url) => setEditForm({ ...editForm, photoUrl: url })} />
              <label>Family contact</label>
              <input value={editForm.familyContact} onChange={(e) => setEditForm({ ...editForm, familyContact: e.target.value })} />
              <label>Reason for this edit (recorded in history)</label>
              <input value={editForm.changeReason} onChange={(e) => setEditForm({ ...editForm, changeReason: e.target.value })} placeholder="e.g. Corrected age from family clarification" />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary">Save changes</button>
                <button type="button" className="btn btn-outline" onClick={() => setEditMode(false)}>Cancel</button>
              </div>
            </form>
          )}

          {showVersions && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div className="topbar" style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 14 }}>Version history ({versions.length})</strong>
                <button className="btn btn-outline" onClick={() => setShowVersions(false)}>Hide</button>
              </div>
              {versions.length === 0 && <p className="muted">No edits recorded yet.</p>}
              {versions.map((v) => (
                <div key={v._id} className="card" style={{ marginBottom: 8, padding: 12 }}>
                  <p style={{ margin: 0 }}><strong>{v.snapshot.fullName}</strong>, age {v.snapshot.age}</p>
                  <p className="muted" style={{ margin: '4px 0' }}>{v.changeReason} — by {v.changedBy?.name} on {new Date(v.createdAt).toLocaleString()}</p>
                  <button className="btn btn-outline" onClick={() => restoreVersion(v._id)}>Restore this version</button>
                </div>
              ))}
            </div>
          )}

          {caseData.status === 'emergency_pending' && canAttachFir && (
            <>
              <form onSubmit={attachFir} style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <label>Attach FIR number to verify this case</label>
                <input required value={firInput} onChange={(e) => setFirInput(e.target.value)} placeholder="e.g. FIR/2026/00123" />
                <button className="btn btn-primary" style={{ marginTop: 10 }}>Attach FIR &amp; Verify</button>
              </form>

              {closeError && <p className="error-text">{closeError}</p>}

              {!showCloseWithoutFinding ? (
                <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => setShowCloseWithoutFinding(true)}>
                  Reject as fake / invalid…
                </button>
              ) : (
                <form onSubmit={submitCloseWithoutFinding} style={{ marginTop: 12, padding: 12, background: 'var(--surface-raised)', borderRadius: 6 }}>
                  <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
                    Rejecting this report closes it permanently. This is logged against your account
                    and reported to oversight.
                  </p>
                  <label>Reason (required)</label>
                  <select required value={closureReason} onChange={(e) => setClosureReason(e.target.value)}>
                    <option value="">Select a reason…</option>
                    <option value="false_report">False report</option>
                    <option value="duplicate_case">Duplicate case</option>
                    <option value="withdrawn_by_family">Withdrawn by family</option>
                    <option value="other">Other (explain below)</option>
                  </select>
                  <label>Note {closureReason === 'other' && '(required)'}</label>
                  <input
                    value={closureNote}
                    onChange={(e) => setClosureNote(e.target.value)}
                    required={closureReason === 'other'}
                    placeholder="Explain the circumstances"
                  />
                  {closureReason === 'false_report' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12, padding: 10, background: 'var(--bg)', borderRadius: 6 }}>
                      <input
                        type="checkbox"
                        id="suspendReporter"
                        checked={suspendReporter}
                        onChange={(e) => setSuspendReporter(e.target.checked)}
                        style={{ width: 'auto', marginTop: 3 }}
                      />
                      <label htmlFor="suspendReporter" style={{ margin: 0, fontSize: 12.5, fontWeight: 400 }}>
                        Also suspend the account that filed this report ({caseData.createdBy?.name}) — use only
                        for a confirmed fraudulent submission, not an honest mistake or duplicate.
                      </label>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn btn-danger">Confirm rejection</button>
                    <button type="button" className="btn btn-outline" onClick={() => { setShowCloseWithoutFinding(false); setSuspendReporter(false); }}>Cancel</button>
                  </div>
                </form>
              )}
            </>
          )}

          {canVerify && caseData.status !== 'closed' && caseData.status !== 'emergency_pending' && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              {caseData.status === 'found' && (
                <p className="muted" style={{ marginTop: 0, marginBottom: 10, fontSize: 13 }}>
                  This case is marked Found. Close it once any follow-up is complete.
                </p>
              )}

              {closeError && <p className="error-text" style={{ marginTop: 0 }}>{closeError}</p>}

              <div style={{ display: 'flex', gap: 8 }}>
                {['verified', 'under_search'].includes(caseData.status) && (
                  <button className="btn btn-primary" onClick={() => updateStatus('found')}>Mark Found</button>
                )}
                {/* Close Case from Found is a normal resolution — any
                    operational role can do it, no special reason needed. */}
                {caseData.status === 'found' && (
                  <button className="btn btn-outline" onClick={() => updateStatus('closed')}>Close Case</button>
                )}
                {/* Closing WITHOUT a Found resolution is the sensitive
                    path — only District Control and above, and only
                    with a specific mandatory reason. A Police Admin
                    never sees this option at all; the backend would
                    reject it anyway, but the UI shouldn't dangle
                    something it can't deliver. */}
                {['verified', 'under_search'].includes(caseData.status) && canCloseWithoutFinding && !showCloseWithoutFinding && (
                  <button className="btn btn-outline" onClick={() => setShowCloseWithoutFinding(true)}>Close without finding…</button>
                )}
              </div>

              {['verified', 'under_search'].includes(caseData.status) && !canCloseWithoutFinding && (
                <p className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>
                  Only District Control and above can close a case that hasn't been marked Found —
                  mark it Found first, or escalate to your District Control if it needs to be closed for another reason.
                </p>
              )}

              {showCloseWithoutFinding && (
                <form onSubmit={submitCloseWithoutFinding} style={{ marginTop: 12, padding: 12, background: 'var(--surface-raised)', borderRadius: 6 }}>
                  <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
                    This closes the case without a Found resolution. It's logged permanently against
                    your account and reported to oversight — use it only for a genuine reason below.
                  </p>
                  <label>Reason (required)</label>
                  <select required value={closureReason} onChange={(e) => setClosureReason(e.target.value)}>
                    <option value="">Select a reason…</option>
                    <option value="false_report">False report</option>
                    <option value="duplicate_case">Duplicate case</option>
                    <option value="withdrawn_by_family">Withdrawn by family</option>
                    <option value="resolved_other_means">Resolved through other means</option>
                    <option value="other">Other (explain below)</option>
                  </select>
                  <label>Note {closureReason === 'other' && '(required)'}</label>
                  <input
                    value={closureNote}
                    onChange={(e) => setClosureNote(e.target.value)}
                    required={closureReason === 'other'}
                    placeholder="Explain the circumstances"
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn btn-danger">Confirm close without finding</button>
                    <button type="button" className="btn btn-outline" onClick={() => setShowCloseWithoutFinding(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {canReassignStation && stations.length > 0 && (
            <form onSubmit={reassignStation} style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <label>Reassign to a different station in your district</label>
              <select required value={reassignTarget} onChange={(e) => setReassignTarget(e.target.value)}>
                <option value="">Select a station…</option>
                {stations.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.district})</option>)}
              </select>
              <label>Reason</label>
              <input value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} placeholder="e.g. Rebalancing case load" />
              <button className="btn btn-outline" style={{ marginTop: 10 }}>Reassign case</button>
            </form>
          )}
        </div>

        <div className="card">
          <h3>Timeline</h3>
          <ul className="timeline">
            {caseData.timeline?.map((t, i) => (
              <li key={i}>
                <strong>{t.label}</strong>
                {t.actor?.name && <span className="muted"> — {t.actor.name} ({ROLE_LABELS[t.actor.role] || t.actor.role})</span>}
                <br />
                <span className="muted">{t.note}</span><br />
                <span className="muted" style={{ fontSize: 11 }}>{new Date(t.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(caseData.involvedNgos?.length > 0 || caseData.assignedVolunteers?.length > 0 || isInvolvedNgoAdmin) && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>NGO &amp; Volunteer Involvement</h3>

          {caseData.involvedNgos?.length > 0 ? (
            <ul style={{ paddingLeft: 18, margin: '0 0 12px' }}>
              {caseData.involvedNgos.map((n, i) => (
                <li key={i}>
                  <strong>{n.organizationName}</strong> — linked {n.linkedVia === 'sighting_proximity' ? 'automatically via a nearby sighting' : 'manually'} on {new Date(n.linkedAt).toLocaleDateString()}
                </li>
              ))}
            </ul>
          ) : <p className="muted">No NGOs linked to this case yet — this happens automatically when a sighting is reported near an NGO's service area.</p>}

          {caseData.assignedVolunteers?.length > 0 && (
            <>
              <p style={{ marginBottom: 4 }}><strong>Assigned volunteers</strong></p>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {caseData.assignedVolunteers.map((a, i) => (
                  <li key={i}>{a.volunteer?.name} {a.note && `— ${a.note}`}</li>
                ))}
              </ul>
            </>
          )}

          {isInvolvedNgoAdmin && myVolunteers.length > 0 && (
            <form onSubmit={assignVolunteer} style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <label>Assign one of your volunteers to this case</label>
              <select value={assignVolunteerId} onChange={(e) => setAssignVolunteerId(e.target.value)}>
                <option value="">Select a volunteer…</option>
                {myVolunteers.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
              <button className="btn btn-primary" style={{ marginTop: 10 }}>Assign</button>
            </form>
          )}

          {(isInvolvedNgoAdmin || isAssignedVolunteer) && (
            <form onSubmit={postFieldUpdate} style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <label>Post a field update</label>
              <textarea rows={2} value={fieldUpdateNote} onChange={(e) => setFieldUpdateNote(e.target.value)} placeholder="e.g. Distributed flyers in the Andheri area, no leads yet" />
              <button className="btn btn-outline" style={{ marginTop: 10 }}>Post update</button>
            </form>
          )}
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>Sightings ({sightings.length})</h3>
      {sightings.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SightingMap
            sightings={sightings}
            caseLocation={caseData.lastSeenLocation}
            onVerify={canVerify ? (sightingId) => verifySighting(sightingId, 'verified') : undefined}
            onReject={canVerify ? (sightingId) => verifySighting(sightingId, 'rejected') : undefined}
          />
        </div>
      )}
      <div className="grid" style={{ gap: 12 }}>
        {sightings.map((s) => (
          <div className="card" key={s._id}>
            <div className="topbar" style={{ marginBottom: 8 }}>
              <strong>{s.location?.address}</strong>
              <StatusPill status={s.status} />
            </div>
            <p>{s.description}</p>
            {s.evidenceUrls?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {s.evidenceUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="evidence" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />
                  </a>
                ))}
              </div>
            )}
            <p className="muted">Reported by {s.reportedBy?.name} ({ROLE_LABELS[s.reportedBy?.role] || s.reportedBy?.role}) on {new Date(s.seenAt).toLocaleString()}</p>
            {canVerify && s.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={() => verifySighting(s._id, 'verified')}>Verify</button>
                <button className="btn btn-outline" onClick={() => verifySighting(s._id, 'rejected')}>Reject</button>
              </div>
            )}
          </div>
        ))}
        {sightings.length === 0 && <p className="muted">No sightings reported yet.</p>}
      </div>

      {canSubmitSighting && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Report a sighting</h3>
          <form onSubmit={submitSighting}>
            <label>Description</label>
            <textarea required rows={3} value={sightingForm.description} onChange={(e) => setSightingForm({ ...sightingForm, description: e.target.value })} />
            <div className="grid grid-2">
              <div><label>Address</label><input required value={sightingForm.address} onChange={(e) => setSightingForm({ ...sightingForm, address: e.target.value })} /></div>
              <div />
            </div>
            <LocationField lat={sightingForm.lat} lng={sightingForm.lng} onChange={({ lat, lng }) => setSightingForm((f) => ({ ...f, lat, lng }))} label="Where did you see them?" />
            <FileUpload label="Evidence photos (optional)" multiple onUploaded={(urls) => setSightingForm({ ...sightingForm, evidenceUrls: urls })} />
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy}>{busy ? 'Submitting…' : 'Submit sighting'}</button>
          </form>
        </div>
      )}

      {(caseData.documents?.length > 0 || caseData.additionalInfo?.length > 0 || caseData.photos?.length > 0 || canContributeCaseMaterial) && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Case Material</h3>
          <p className="muted" style={{ marginTop: -6, fontSize: 12.5 }}>Documents, photos, and additional information from the family and investigating officers.</p>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {['Documents', 'Additional Information', 'Photos'].map((t) => (
              <button key={t} className={materialTab === t ? 'btn btn-primary' : 'btn btn-outline'} style={{ padding: '5px 11px', fontSize: 12 }} onClick={() => setMaterialTab(t)}>{t}</button>
            ))}
          </div>

          {materialTab === 'Documents' && <DocumentsPanel caseId={caseData._id} documents={caseData.documents} onChanged={load} canAdd={canContributeCaseMaterial} />}
          {materialTab === 'Additional Information' && <AdditionalInfoPanel caseId={caseData._id} additionalInfo={caseData.additionalInfo} onChanged={load} canAdd={canContributeCaseMaterial} />}
          {materialTab === 'Photos' && <PhotosPanel caseId={caseData._id} photoUrl={null} photos={caseData.photos} onChanged={load} canAdd={canContributeCaseMaterial} />}
        </div>
      )}
    </div>
  );
}
