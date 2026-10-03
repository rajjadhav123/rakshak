import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAreas } from '../../hooks/useAreas.js';
import { ROLE_LABELS, ROLE_LEVEL, ROLES } from '../../roles.js';

const ALL_CREATABLE_ROLES = ['system_admin', 'state_control', 'district_control', 'police_admin', 'ngo_admin', 'ngo_volunteer'];

const emptyOfficial = { name: '', email: '', phone: '', password: '', role: 'police_admin', state: '', district: '', policeStationId: '', organizationName: '', ngoLat: '', ngoLng: '', ngoRadiusKm: '25' };
const emptyVolunteer = { name: '', email: '', phone: '', password: '' };

export default function AdminUsers() {
  const { user } = useAuth();
  const { districts: DISTRICTS } = useAreas();
  const isNgoAdmin = user.role === ROLES.NGO_ADMIN;
  // A State/District Control account can only ever create within its
  // own territory — see backend/utils/userHierarchy.js, which enforces
  // this server-side regardless of what this form sends. Locking it
  // here too is just a better experience: no point letting someone
  // type a district that would be silently overridden anyway.
  const jurisdictionLocked = user.role === ROLES.STATE_CONTROL || user.role === ROLES.DISTRICT_CONTROL;
  // Only offer roles strictly below the viewer's own level — matches
  // exactly what the backend will actually accept, so a District
  // Control never sees "State Control" as an option only to have it
  // rejected on submit.
  const creatableRoles = ALL_CREATABLE_ROLES.filter((r) => (ROLE_LEVEL[r] ?? 0) < (ROLE_LEVEL[user.role] ?? 0));

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(isNgoAdmin ? emptyVolunteer : emptyOfficial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stationOptions, setStationOptions] = useState([]);

  useEffect(() => {
    if (jurisdictionLocked) {
      setForm((f) => ({ ...f, state: user.jurisdiction?.state || '', district: user.role === ROLES.DISTRICT_CONTROL ? (user.jurisdiction?.district || '') : f.district }));
    }
  }, [jurisdictionLocked]); // eslint-disable-line

  // A Police Admin without a real station can never see any case
  // that's been routed to one (see canViewCase in the backend) — this
  // list is what makes that field an actual dropdown instead of the
  // free-text-or-nothing gap that used to leave it unset entirely.
  useEffect(() => {
    if (form.role !== 'police_admin' || !form.district) {
      setStationOptions([]);
      return;
    }
    let cancelled = false;
    api.get('/stations', { params: { district: form.district } })
      .then(({ data }) => { if (!cancelled) setStationOptions(data.stations); })
      .catch(() => { if (!cancelled) setStationOptions([]); });
    return () => { cancelled = true; };
  }, [form.role, form.district]);

  // A station picked for one district is meaningless (and rejected by
  // the backend) once the district changes — clear it rather than let
  // a stale selection sit in the form looking valid.
  const setDistrict = (district) => setForm((f) => ({ ...f, district, policeStationId: '' }));

  const load = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load users — check your connection and try again.');
    }
  };

  useEffect(() => { load(); }, []);

  const submitVolunteer = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.post('/users', { ...form, role: ROLES.NGO_VOLUNTEER });
      setForm(emptyVolunteer);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create volunteer account');
    } finally { setBusy(false); }
  };

  const submitOfficial = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const payload = {
        name: form.name, email: form.email, phone: form.phone, password: form.password, role: form.role,
        jurisdiction: {
          state: form.state,
          district: form.district,
          policeStationId: form.role === 'police_admin' ? (form.policeStationId || undefined) : undefined,
        },
      };
      if (form.role === 'ngo_admin') {
        payload.ngo = {
          organizationName: form.organizationName,
          serviceArea: form.ngoLat && form.ngoLng
            ? { geo: { type: 'Point', coordinates: [Number(form.ngoLng), Number(form.ngoLat)] }, radiusKm: Number(form.ngoRadiusKm) || 25 }
            : undefined,
        };
      }
      await api.post('/users', payload);
      setForm(emptyOfficial);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
    } finally { setBusy(false); }
  };

  const toggle = async (u) => {
    try {
      await api.patch(`/users/${u._id}/${u.status === 'suspended' ? 'approve' : 'suspend'}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Could not ${u.status === 'suspended' ? 'approve' : 'suspend'} this account.`);
    }
  };

  return (
    <div>
      <h2>{isNgoAdmin ? 'My Volunteers' : 'Manage Officials'}</h2>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {isNgoAdmin ? (
          <form className="card" onSubmit={submitVolunteer}>
            <h3>Add a volunteer</h3>
            <p className="muted" style={{ marginTop: 0 }}>Automatically added to your organization ({user.ngo?.organizationName}).</p>
            <label>Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label>Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label>Phone</label>
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <label>Temporary password</label>
            <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy}>{busy ? 'Adding…' : 'Add volunteer'}</button>
          </form>
        ) : (
          <form className="card" onSubmit={submitOfficial}>
            <h3>Create official account</h3>
            <label>Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label>Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label>Phone</label>
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <label>Temporary password</label>
            <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {creatableRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <div className="grid grid-2">
              <div>
                <label>State {['police_admin', 'district_control', 'state_control'].includes(form.role) && '*'}</label>
                {jurisdictionLocked ? (
                  <input value={form.state} disabled title="Locked to your own state" />
                ) : (
                  <input required={['police_admin', 'district_control', 'state_control'].includes(form.role)} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="e.g. Maharashtra" />
                )}
              </div>
              <div>
                <label>District {['police_admin', 'district_control'].includes(form.role) && '*'}</label>
                {user.role === ROLES.DISTRICT_CONTROL ? (
                  <input value={form.district} disabled title="Locked to your own district" />
                ) : (
                  <select required={['police_admin', 'district_control'].includes(form.role)} value={form.district} onChange={(e) => setDistrict(e.target.value)}>
                    <option value="">— Select district —</option>
                    {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>
            </div>
            {form.role === 'police_admin' && (
              <div>
                <label>Police station *</label>
                <select required value={form.policeStationId} onChange={(e) => setForm({ ...form, policeStationId: e.target.value })} disabled={!form.district}>
                  <option value="">{form.district ? '— Select station —' : 'Select a district first'}</option>
                  {stationOptions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                {form.district && stationOptions.length === 0 && (
                  <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>No stations found in {form.district} yet.</p>
                )}
              </div>
            )}
            {jurisdictionLocked && (
              <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
                New accounts are always created within your own {user.role === ROLES.DISTRICT_CONTROL ? 'district' : 'state'} — this can't be changed here.
              </p>
            )}
            {form.role === 'ngo_admin' && (
              <>
                <label>Organization name</label>
                <input value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} />
                <label>Service area (used to auto-involve this NGO in nearby sightings)</label>
                <div className="grid grid-2">
                  <div><label>Latitude</label><input type="number" step="any" value={form.ngoLat} onChange={(e) => setForm({ ...form, ngoLat: e.target.value })} /></div>
                  <div><label>Longitude</label><input type="number" step="any" value={form.ngoLng} onChange={(e) => setForm({ ...form, ngoLng: e.target.value })} /></div>
                </div>
                <label>Coverage radius (km)</label>
                <input type="number" value={form.ngoRadiusKm} onChange={(e) => setForm({ ...form, ngoRadiusKm: e.target.value })} />
              </>
            )}
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
            <p className="muted" style={{ marginTop: 10 }}>You can only create roles below your own authority level.</p>
          </form>
        )}

        <div className="card">
          <h3>{isNgoAdmin ? `My volunteers (${users.length})` : `Accounts under your authority (${users.length})`}</h3>
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}<br /><span className="muted">{u.email}</span></td>
                  <td>{ROLE_LABELS[u.role] || u.role}</td>
                  <td>{u.status}</td>
                  <td>
                    <button className="btn btn-outline" onClick={() => toggle(u)}>
                      {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
