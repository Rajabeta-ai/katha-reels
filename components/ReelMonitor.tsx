'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Reel } from '@/lib/types';
import { FORMAT } from '@/lib/microdrama';
import { beatMeta, hookMeta, cliffMeta, BeatTimeline, fmtBytes } from './bits';
import { useJob } from './useJob';

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export default function ReelMonitor({ initial, chapterId, seriesId }: { initial: Reel; chapterId: string; seriesId: string }) {
  const [reel, setReel] = useState(initial);
  const [tab, setTab] = useState<'beats' | 'shots' | 'qc' | 'publish'>('beats');
  const [dirty, setDirty] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/reels/${initial.id}`);
    if (r.ok) setReel(await r.json());
  }, [initial.id]);

  const { job, track, busy } = useJob(refresh);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [busy, refresh]);

  async function build(stage: 'all' | 'visuals' | 'voice' | 'render', force = false) {
    const res = await fetch(`/api/reels/${reel.id}/build`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stage, force }),
    });
    const j = await res.json();
    if (j.jobId) track(j.jobId);
  }

  async function save() {
    const res = await fetch(`/api/reels/${reel.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        beats: reel.beats.map((b) => ({ id: b.id, vo_hi: b.vo_hi, onScreenText_hi: b.onScreenText_hi })),
        shots: reel.shots.map((s) => ({ id: s.id, imagePrompt: s.imagePrompt, motion: s.motion })),
      }),
    });
    if (res.ok) { setReel(await res.json()); setDirty(false); }
  }

  const h = hookMeta(reel.hookType);
  const c = cliffMeta(reel.cliffhangerType);
  const blockers = reel.qc.filter((q) => !q.pass && q.severity === 'blocker');
  const imgsReady = reel.shots.filter((s) => s.imageStatus === 'ready').length;

  return (
    <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip border-[var(--color-gold-dim)] font-mono text-[var(--color-gold)]">EP {reel.episode}</span>
            <span className="chip text-[var(--color-sindoor)]" title={`${h?.hi} · duanju ${h?.duanju}`}>Hook · {h?.en}</span>
            <span className="chip text-emerald-400" title={c?.hi}>Cliff · {c?.en}</span>
            <span className="chip font-mono">{reel.durationSec}s</span>
            <span className="chip font-mono">{FORMAT.width}×{FORMAT.height}</span>
          </div>
          <h1 className="hi mt-3 text-3xl font-extrabold">{reel.title_hi}</h1>
          <p className="hi mt-1.5 text-[14.5px] leading-relaxed text-neutral-400">{reel.logline_hi}</p>
          <div className="mt-2 text-[11px] text-neutral-600">Source: <span className="hi">{reel.sourceNote}</span></div>
        </header>

        {/* Loop continuity — the thing that makes a series bingeable */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Pichle episode ka jawaab (0–3s)</div>
            <div className="hi mt-1 text-[13.5px] leading-relaxed text-emerald-100/80">
              {reel.closesLoop_hi || (reel.episode === 1 ? 'Episode 1 — bina kisi context ke hook karna hai' : '—')}
            </div>
          </div>
          <div className="rounded-xl border border-violet-900/50 bg-violet-950/20 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Ye episode jo sawaal chhodega</div>
            <div className="hi mt-1 text-[13.5px] leading-relaxed text-violet-100/80">{reel.openLoop_hi}</div>
          </div>
        </div>

        <div className="mt-6">
          <BeatTimeline reel={reel} height="h-3" />
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-neutral-600">
            <span>0s</span><span>{reel.durationSec}s</span>
          </div>
        </div>

        <nav className="mt-7 flex gap-1 border-b border-[var(--color-line)]">
          {([['beats', 'Beats'], ['shots', `Shots (${reel.shots.length})`], ['qc', `QC${blockers.length ? ` · ${blockers.length}` : ''}`], ['publish', 'Publish']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 text-[13px] font-semibold transition ${tab === k ? 'border-b-2 border-[var(--color-gold)] text-[var(--color-gold)]' : 'text-neutral-500 hover:text-neutral-300'}`}>
              {label}
            </button>
          ))}
          {dirty && <button onClick={save} className="btn btn-gold ml-auto mb-1 !py-1 !text-xs">Changes save karein</button>}
        </nav>

        {tab === 'beats' && (
          <div className="mt-5 space-y-3">
            {[...reel.beats].sort((a, b) => a.startSec - b.startSec).map((b) => {
              const m = beatMeta(b.kind);
              const span = b.endSec - b.startSec;
              const need = words(b.vo_hi) / FORMAT.hindiWordsPerSecond;
              const over = need > span * 1.15;
              const under = need < span * 0.4;
              return (
                <div key={b.id} className={`beat-${b.kind} rounded-xl border p-4 beat-soft`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="beat-text text-sm font-extrabold">{m.label_en}</span>
                    <span className="hi text-[10px] font-bold uppercase tracking-widest text-neutral-500">{m.label_hi}</span>
                    <span className="ml-auto font-mono text-[11px] text-neutral-500">{b.startSec}s → {b.endSec}s · {span.toFixed(1)}s</span>
                  </div>
                  <div className="mt-2 text-[11px] leading-relaxed text-neutral-500">{m.rule}</div>

                  <label className="mt-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">Voice-over (Hindi)</label>
                  <textarea
                    value={b.vo_hi}
                    onChange={(e) => { setReel({ ...reel, beats: reel.beats.map((x) => x.id === b.id ? { ...x, vo_hi: e.target.value } : x) }); setDirty(true); }}
                    rows={2}
                    className="hi mt-1 w-full resize-y rounded-lg border border-[var(--color-line)] bg-black/30 px-3 py-2 text-[14px] leading-relaxed outline-none focus:border-[var(--color-gold)]"
                  />
                  <div className={`mt-1 font-mono text-[10px] ${over ? 'text-rose-400' : under ? 'text-amber-500' : 'text-neutral-600'}`}>
                    {words(b.vo_hi)} shabd ≈ {need.toFixed(1)}s / {span.toFixed(1)}s available
                    {over && ' — bahut lamba, audio beat se bahar chala jayega'}
                    {under && ' — bahut chhota, khaali jagah bachegi'}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500">On-screen text (burned-in)</label>
                      <input
                        value={b.onScreenText_hi}
                        onChange={(e) => { setReel({ ...reel, beats: reel.beats.map((x) => x.id === b.id ? { ...x, onScreenText_hi: e.target.value } : x) }); setDirty(true); }}
                        className="hi mt-1 w-full rounded-lg border border-[var(--color-line)] bg-black/30 px-3 py-2 text-[14px] outline-none focus:border-[var(--color-gold)]"
                      />
                      <div className={`mt-1 font-mono text-[10px] ${words(b.onScreenText_hi) > 7 ? 'text-amber-500' : 'text-neutral-600'}`}>
                        {words(b.onScreenText_hi)}/7 shabd
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Darshak kya dekhega</div>
                      <div className="hi mt-1 text-[13px] leading-relaxed text-neutral-400">{b.direction_hi}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="card rounded-xl p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Music cue</div>
              <div className="hi mt-1 text-[13.5px] leading-relaxed text-neutral-300">{reel.musicCue}</div>
            </div>
          </div>
        )}

        {tab === 'shots' && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[...reel.shots].sort((a, b) => a.order - b.order).map((s) => (
              <div key={s.id} className={`beat-${s.beatKind} card rounded-xl p-3`}>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="font-mono font-bold text-neutral-400">#{s.order}</span>
                  <span className="beat-text font-bold">{beatMeta(s.beatKind).label_en}</span>
                  <span className="font-mono text-neutral-600">{s.startSec}–{s.endSec}s</span>
                  {s.useVeo && <span className="chip !py-0.5 text-[var(--color-lotus)]">Veo</span>}
                  <span className="ml-auto font-mono text-neutral-600">{s.motion}</span>
                </div>

                <div className="mt-2 aspect-[9/16] overflow-hidden rounded-lg bg-black/50">
                  {s.imageStatus === 'ready' && s.imagePath ? (
                    // Filename follows the provider's actual format (Gemini returns JPEG,
                    // OpenAI/fal return PNG), so derive it rather than assuming .png.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/assets/${reel.id}/${s.imagePath.split('/').pop()}`} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-[11px] text-neutral-600">
                      {s.imageStatus === 'running' ? 'Ban raha hai…' : s.imageStatus === 'failed' ? <span className="px-3 text-rose-400">{s.error?.slice(0, 90)}</span> : 'Baaki hai'}
                    </div>
                  )}
                </div>

                <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600">{s.framing}</div>
                <textarea
                  value={s.imagePrompt}
                  onChange={(e) => { setReel({ ...reel, shots: reel.shots.map((x) => x.id === s.id ? { ...x, imagePrompt: e.target.value } : x) }); setDirty(true); }}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-[var(--color-line)] bg-black/30 px-2.5 py-2 text-[11px] leading-relaxed text-neutral-400 outline-none focus:border-[var(--color-gold)]"
                />
                <button
                  onClick={async () => {
                    setReel({ ...reel, shots: reel.shots.map((x) => x.id === s.id ? { ...x, imageStatus: 'running' } : x) });
                    const r = await fetch(`/api/reels/${reel.id}/regenerate-shot`, {
                      method: 'POST', headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ shotId: s.id, imagePrompt: s.imagePrompt }),
                    });
                    if (r.ok) setReel(await r.json()); else refresh();
                  }}
                  className="btn btn-ghost mt-2 w-full !py-1.5 !text-[11px]">
                  ⟳ Ye shot dobara banaiye
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'qc' && (
          <div className="mt-5 space-y-2">
            {reel.qc.length === 0 && <div className="text-sm text-neutral-500">QC abhi nahi chala — koi change save karein ya render chalaayein.</div>}
            {reel.qc.map((q) => (
              <div key={q.id} className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${q.pass ? 'border-[var(--color-line)] bg-white/[0.02]' : q.severity === 'blocker' ? 'border-rose-900/60 bg-rose-950/20' : 'border-amber-900/60 bg-amber-950/15'}`}>
                <span className={`mt-0.5 text-sm ${q.pass ? 'text-emerald-400' : q.severity === 'blocker' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {q.pass ? '✓' : q.severity === 'blocker' ? '✕' : '!'}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">{q.label}</div>
                  <div className="hi mt-0.5 font-mono text-[11px] text-neutral-500">{q.note}</div>
                </div>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-neutral-600">{q.severity}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'publish' && (
          <div className="mt-5 space-y-4">
            <Copyable label="Instagram caption" value={reel.publish.caption_ig} hi />
            <Copyable label="Hashtags" value={reel.publish.hashtags.join(' ')} />
            <Copyable label={`YouTube Shorts title (${reel.publish.youtubeTitle.length}/60)`} value={reel.publish.youtubeTitle} hi />
            <Copyable label="YouTube description" value={reel.publish.youtubeDescription} hi />
          </div>
        )}
      </div>

      {/* Right rail: preview + build controls */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-black">
          {reel.render.status === 'ready' ? (
            <video src={`/api/download/${reel.id}`} controls playsInline className="aspect-[9/16] w-full bg-black" />
          ) : (
            <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 text-center text-[12px] text-neutral-600">
              <span className="text-3xl">🎬</span>
              <span>Abhi render nahi hua</span>
              {reel.render.status === 'failed' && <span className="px-4 text-[11px] text-rose-400">{reel.render.error}</span>}
            </div>
          )}
        </div>

        {reel.render.status === 'ready' && (
          <div className="flex gap-2">
            <a href={`/api/download/${reel.id}?dl=1`} download className="btn btn-gold flex-1">⤓ MP4 download</a>
            <Link href={`/feed?series=${seriesId}&start=${reel.id}`} className="btn btn-ghost">Feed</Link>
          </div>
        )}

        <div className="card rounded-xl p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Pipeline</div>
          <Row label={`Visuals (${imgsReady}/${reel.shots.length})`} status={imgsReady === reel.shots.length && imgsReady > 0 ? 'ready' : imgsReady ? 'running' : 'pending'}
            action={() => build('visuals')} busy={busy} />
          <Row label={`Narration${reel.voice.durationSec ? ` · ${reel.voice.durationSec}s` : ''}`} status={reel.voice.status} action={() => build('voice')} busy={busy} error={reel.voice.error} />
          <Row label={`Render${reel.render.sizeBytes ? ` · ${fmtBytes(reel.render.sizeBytes)}` : ''}`} status={reel.render.status} action={() => build('render')} busy={busy} error={reel.render.error} />

          <button onClick={() => build('all')} disabled={busy} className="btn btn-gold mt-4 w-full">
            {busy ? 'Chal raha hai…' : '✦ Poori reel banaiye'}
          </button>
          <button onClick={() => build('visuals', true)} disabled={busy} className="btn btn-ghost mt-2 w-full !text-[11px]">
            Saare visuals dobara banaiye
          </button>

          {job && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>{job.step}</span><span className="font-mono">{job.done}/{job.total}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                <div className="h-full bg-[var(--color-gold)] transition-all" style={{ width: `${Math.round((job.done / Math.max(job.total, 1)) * 100)}%` }} />
              </div>
              {job.error && <div className="mt-2 text-[11px] leading-relaxed text-rose-400">{job.error}</div>}
            </div>
          )}
        </div>

        <Link href={`/chapter/${chapterId}`} className="btn btn-ghost w-full">← Poori series</Link>
      </aside>
    </div>
  );
}

function Row({ label, status, action, busy, error }: { label: string; status?: string; action: () => void; busy: boolean; error?: string }) {
  const tone: Record<string, string> = { ready: 'text-emerald-400', running: 'text-sky-400', failed: 'text-rose-400', pending: 'text-neutral-500' };
  return (
    <div className="flex items-center gap-2 border-b border-[var(--color-line)] py-2 last:border-0">
      <span className={`text-[11px] ${tone[status ?? 'pending']}`}>●</span>
      <span className="flex-1 text-[13px] text-neutral-300">{label}</span>
      <button onClick={action} disabled={busy} className="text-[11px] text-neutral-500 hover:text-[var(--color-gold)] disabled:opacity-40">
        {status === 'ready' ? 'Dobara' : 'Chalaayein'}
      </button>
      {error && <span title={error} className="text-[11px] text-rose-500">!</span>}
    </div>
  );
}

function Copyable({ label, value, hi }: { label: string; value: string; hi?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card rounded-xl p-4">
      <div className="mb-2 flex items-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          className="ml-auto text-[11px] text-neutral-500 hover:text-[var(--color-gold)]">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className={`${hi ? 'hi' : ''} whitespace-pre-wrap text-[13.5px] leading-relaxed text-neutral-300`}>{value}</div>
    </div>
  );
}
