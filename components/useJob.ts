'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Job } from '@/lib/jobs';

/** Polls a background job until it settles, then fires onDone. */
export function useJob(onDone?: () => void) {
  const [job, setJob] = useState<Job | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cb = useRef(onDone);
  cb.current = onDone;

  const stop = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);

  const track = useCallback((jobId: string) => {
    stop();
    timer.current = setInterval(async () => {
      try {
        const j: Job = await fetch(`/api/jobs/${jobId}`).then((r) => r.json());
        setJob(j);
        if (j.status !== 'running') { stop(); cb.current?.(); }
      } catch { /* transient dev-server hiccup; keep polling */ }
    }, 1500);
  }, [stop]);

  useEffect(() => stop, [stop]);
  return { job, track, busy: job?.status === 'running', clear: () => setJob(null) };
}
