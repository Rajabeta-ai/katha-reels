'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Series } from '@/lib/types';
import { BeatTimeline, QcDots, StatusDot, hookMeta, cliffMeta, reelProgress } from './bits';
import { useJob } from './useJob';

export default function ChapterStudio({
  chapterId, suggested, initialSeries,
}: { chapterId: string; suggested: number; initialSeries: Series | null }) {
  const [series, setSeries] = useState<Series | null>(initialSeries);
  const [count, setCount] = useState(suggested);
  const [mode, setMode] = useState<'kids' | 'adults'>('adults');
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!series?.id) return;
    const r = await fetch(`/api/series/${series.id}`);
    if (r.ok) setSeries(await r.json());
  }, [series?.id]);

  const { job, track, busy } = useJob(refresh);

  // Stream in episodes as the writer finishes them, rather than waiting for the lot.
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [busy, refresh]);

  async function create(regenerate = false) {
    setErr(null);
    const res = await fetch('/api/series/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chapterId, mode, count, regenerate }),
    });
    const j = await res.json();
    if (!res.ok) return setErr(j.error ?? 'Banane mein problem aayi');
    const s = await fetch(`/api/series/${j.seriesId}`).then((r) => r.json());
    setSeries(s);
    if (j.jobId) track(j.jobId);
  }

  const ready = series?.reels.filter((r) => r.render.status === 'ready').length ?? 0;

  return (
    <section className="mt-12 border-t border-[var(--color-line)] pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold">Reel series</h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-neutral-500">
            Adhyaay ko microdrama episodes mein toda jayega — har episode mein Hook → Friction → Escalation →
            Spike → Button, aur aakhir mein cliffhanger jo agle episode mein khulega.
          </p>
        </div>

        {!series ? (
          <div className="flex flex-wrap items-center gap-2">
            <select value={mode} onChange={(e) => setMode(e.target.value as 'kids' | 'adults')}
              className="rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-2)] px-3 py-2 text-sm">
              <option value="adults">Adults mode (U/A)</option>
              <option value="kids">Bachon ka mode (U)</option>
            </select>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-2)] px-3 py-2 text-sm">
              {[4, 5, 6, 7, 8, 9, 10, 12].map((n) => <option key={n} value={n}>{n} episodes</option>)}
            </select>
            <button onClick={() => create(false)} disabled={busy} className="btn btn-gold">
              {busy ? 'Ban raha hai…' : '✦ Reels banaiye'}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {ready > 0 && (
              <Link href={`/feed?series=${series.id}`} className="btn btn-gold">▶ Feed mein dekhiye ({ready})</Link>
            )}
            <button onClick={() => create(true)} disabled={busy} className="btn btn-ghost">Dobara likhwaiye</button>
          </div>
        )}
      </div>

      {err && <div className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">{err}</div>}

      {job && job.status !== 'done' && (
        <div className="mt-5 rounded-xl border border-[var(--color-line)] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="hi text-neutral-300">{job.step}</span>
            <span className="font-mono text-neutral-500">{job.done}/{job.total}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full bg-[var(--color-gold)] transition-all"
              style={{ width: `${Math.round((job.done / Math.max(job.total, 1)) * 100)}%` }} />
          </div>
          {job.error && <div className="mt-2 text-[12px] text-rose-400">{job.error}</div>}
        </div>
      )}

      {series && (
        <>
          {series.arcNote_hi && (
            <div className="mt-6 rounded-xl border border-[var(--color-line)] bg-white/[0.02] px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Series arc</div>
              <div className="hi mt-1 text-[14px] leading-relaxed text-neutral-300">{series.arcNote_hi}</div>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {series.reels.map((r) => {
              const p = reelProgress(r);
              const h = hookMeta(r.hookType);
              const c = cliffMeta(r.cliffhangerType);
              return (
                <Link key={r.id} href={`/reel/${r.id}`} className="card block rounded-xl p-5 transition">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="w-12 shrink-0">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">EP</div>
                      <div className="text-2xl font-black text-[var(--color-gold-dim)]">{String(r.episode).padStart(2, '0')}</div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="hi text-lg font-bold">{r.title_hi}</h3>
                        <span className="chip text-[var(--color-sindoor)]">{h?.en}</span>
                        <span className="chip text-emerald-400">{c?.en}</span>
                        <span className="chip font-mono">{r.durationSec}s</span>
                        <QcDots qc={r.qc} />
                      </div>
                      <p className="hi mt-1.5 text-[13.5px] leading-relaxed text-neutral-400">{r.logline_hi}</p>

                      <div className="mt-3"><BeatTimeline reel={r} /></div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500">
                        <span className="flex items-center gap-1.5">
                          <StatusDot status={p.ready === p.imgs && p.imgs > 0 ? 'ready' : p.ready ? 'running' : 'pending'} />
                          Visuals {p.ready}/{p.imgs}
                        </span>
                        <span className="flex items-center gap-1.5"><StatusDot status={p.voice} />Narration</span>
                        <span className="flex items-center gap-1.5"><StatusDot status={p.render} />Render</span>
                        <span className="hi text-neutral-600">↪ {r.openLoop_hi}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
