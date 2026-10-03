import { useEffect, useRef, useState } from 'react';

// Repeatedly calls `detect(videoElement)` roughly every `pollMs`, but
// never starts a new call before the previous one has resolved.
//
// This is the actual fix for why liveness capture used to need 100+
// attempts: the old code used a plain `setInterval(async () => {...},
// 100)`, which does NOT wait for one tick's async work to finish
// before starting the next. On any hardware where a detection call
// took longer than the poll interval — common for face-api's fuller
// pipeline stages without GPU acceleration — calls piled up and each
// one got slower as it competed with the others for the same
// CPU/GPU resources, which is the opposite of what catching a fast
// human gesture like a blink needs. This hook is deliberately generic
// (it has no idea what `detect` even does) so that fix lives in
// exactly one place rather than being re-solved per challenge type.
export function useNonOverlappingPoll({ detect, onFrame, active, pollMs = 100, timeoutMs = 10000, onTimeout }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const timeoutRef = useRef(null);
  // The setup below runs exactly once (empty deps — see why below), so
  // every value from the caller that could plausibly change across
  // re-renders is read through a ref that's updated on every render,
  // not captured directly in the tick closure. Without this, `tick`
  // would keep calling whatever `detect`/`onFrame`/`onTimeout` were on
  // the very first render forever — usually harmless if the caller's
  // versions are behaviorally identical across renders, but that's a
  // property of the caller, not something this hook should have to
  // rely on to be correct.
  const activeRef = useRef(active);
  activeRef.current = active;
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const detectRef = useRef(detect);
  detectRef.current = detect;
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;
  const timeoutMsRef = useRef(timeoutMs);
  timeoutMsRef.current = timeoutMs;

  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const stop = () => {
    clearTimeout(timerRef.current);
    clearTimeout(timeoutRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  // Resets the countdown (and, since polling resumes whenever the
  // caller's own `active` flag next reads true, effectively resumes
  // capture) WITHOUT re-requesting camera access — an internal
  // "try again" after a timeout should never re-trigger the browser's
  // permission flow or re-acquire the stream from scratch.
  const resetTimeout = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onTimeoutRef.current?.(), timeoutMsRef.current);
  };

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);

        timeoutRef.current = setTimeout(() => onTimeoutRef.current?.(), timeoutMsRef.current);

        const tick = async () => {
          if (cancelled || !activeRef.current || !videoRef.current) return;
          const video = videoRef.current;
          const frame = await detectRef.current(video);
          if (cancelled || !activeRef.current) return; // may have finished/unmounted while awaiting
          if (frame) onFrameRef.current(frame, video);
          timerRef.current = setTimeout(tick, pollMs);
        };
        timerRef.current = setTimeout(tick, pollMs);
      })
      .catch(() => setCameraError('Could not access your camera — check your browser\u2019s permission for this site and try again.'));

    return () => { cancelled = true; stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { videoRef, ready, cameraError, stop, resetTimeout };
}

// Grabs a still frame from a live <video> element onto an offscreen
// canvas — cheap (just a pixel copy, no inference), used to "keep" a
// moment from the live stream so its descriptor can be extracted
// later, once, rather than on every polling tick. See faceApi.js's
// detectLivenessFrameLight for why descriptor extraction doesn't
// happen during the hot loop at all.
export function snapshotVideoFrame(video) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0);
  return canvas;
}
