import React, { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import FaceCapture from '../components/FaceCapture.jsx';

const ENROLL_PROMPTS = ['Look straight at the camera', 'Turn slightly to your left', 'Turn slightly to your right'];

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)[1];
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export default function FaceEnrollment() {
  const { user, refreshUser } = useAuth();
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const status = user.faceEnrollment?.status || 'not_enrolled';

  const handleComplete = async (results) => {
    setCapturing(false);
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      results.forEach((r, i) => formData.append('files', dataUrlToBlob(r.imageDataUrl), `face-${i}.jpg`));
      const { data: uploadData } = await api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      await api.post('/face/enroll-request', {
        images: uploadData.files.map((f) => f.url),
        descriptors: results.map((r) => r.descriptor),
      });
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit your enrollment — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Face Enrollment</h2>
      <p className="muted">
        Required before you can verify a case or a sighting — a live face check runs at that moment
        and is matched against what you enroll here. Your District Control Room reviews and approves
        every enrollment before it becomes active.
      </p>

      <div className="card">
        {status === 'enrolled' && (
          <>
            <p style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Enrolled</p>
            <p className="muted" style={{ fontSize: 13 }}>
              Reviewed {user.faceEnrollment?.reviewedAt ? new Date(user.faceEnrollment.reviewedAt).toLocaleString() : ''}.
              Face verification is active for case and sighting verification.
            </p>
            <button className="btn btn-outline" onClick={() => setCapturing(true)} disabled={submitting}>
              Re-enroll (e.g. appearance changed)
            </button>
          </>
        )}

        {status === 'pending' && (
          <p className="muted">
            Your enrollment was submitted {user.faceEnrollment?.submittedAt ? new Date(user.faceEnrollment.submittedAt).toLocaleString() : ''}
            {' '}and is awaiting review by your District Control Room. You'll be notified once it's approved.
          </p>
        )}

        {(status === 'not_enrolled' || status === 'rejected') && !capturing && (
          <>
            {status === 'rejected' && (
              <p className="error-text">
                Your last submission was rejected{user.faceEnrollment?.rejectionReason ? `: ${user.faceEnrollment.rejectionReason}` : '.'} Please resubmit.
              </p>
            )}
            <p className="muted" style={{ fontSize: 13 }}>
              You'll take 3 shots — straight on, left, and right — with your camera. Make sure you're
              alone in frame and reasonably well lit.
            </p>
            <button className="btn btn-primary" onClick={() => setCapturing(true)}>
              Complete face recognition online
            </button>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Prefer to do this in person instead? Visit your District Control office — they can also
              start this from their side.
            </p>
          </>
        )}

        {capturing && (
          <FaceCapture prompts={ENROLL_PROMPTS} onComplete={handleComplete} onCancel={() => setCapturing(false)} />
        )}
        {submitting && <p className="muted">Submitting…</p>}
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
