'use client';
import { BEATS, HOOK_TYPES, CLIFFHANGER_TYPES } from '@/lib/microdrama';
import type { Reel, QcResult } from '@/lib/types';

export const beatMeta = (kind: string) => BEATS.find((b) => b.kind === kind)!;
export const hookMeta = (id: string) => HOOK_TYPES.find((h) => h.id === id);
export const cliffMeta = (id: string) => CLIFFHANGER_TYPES.find((c) => c.id === id);

/** The 5-beat bar. Widths are real proportions of the reel's runtime. */
export function BeatTimeline({ reel, height = 'h-2.5' }: { reel: Reel; height?: string }) {
  const total = reel.durationSec || 1;
  return (
    <div className={`flex ${height} w-full overflow-hidden rounded-full bg-white/5`}>
      {[...reel.beats].sort((a, b) => a.startSec - b.startSec).map((b) => (
        <div
          key={b.id}
          className={`beat-${b.kind} beat-bar`}
          style={{ width: `${((b.endSec - b.startSec) / total) * 100}%` }}
          title={`${beatMeta(b.kind).label_en} · ${b.startSec}s–${b.endSec}s`}
        />
      ))}
    </div>
  );
}

export function QcDots({ qc }: { qc: QcResult[] }) {
  if (!qc.length) return <span className="text-[11px] text-neutral-600">QC nahi chala</span>;
  const blockers = qc.filter((q) => !q.pass && q.severity === 'blocker').length;
  const warns = qc.filter((q) => !q.pass && q.severity === 'warn').length;
  const pct = Math.round((qc.filter((q) => q.pass).length / qc.length) * 100);
  const tone = blockers ? 'text-rose-400' : warns ? 'text-amber-400' : 'text-emerald-400';
  return (
    <span className={`chip ${tone}`}>
      <span className="font-mono">{pct}%</span>
      {blockers > 0 && <span>· {blockers} blocker</span>}
      {!blockers && warns > 0 && <span>· {warns} warn</span>}
      {!blockers && !warns && <span>· saaf</span>}
    </span>
  );
}

export function StatusDot({ status }: { status?: string }) {
  const map: Record<string, string> = {
    ready: 'bg-emerald-400', running: 'bg-sky-400 animate-pulse', failed: 'bg-rose-500', pending: 'bg-neutral-700',
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${map[status ?? 'pending'] ?? 'bg-neutral-700'}`} />;
}

export function reelProgress(reel: Reel) {
  const imgs = reel.shots.length;
  const ready = reel.shots.filter((s) => s.imageStatus === 'ready').length;
  return {
    imgs, ready,
    voice: reel.voice.status,
    render: reel.render.status,
    pct: Math.round(((ready / Math.max(imgs, 1)) * 0.6 + (reel.voice.status === 'ready' ? 0.2 : 0) + (reel.render.status === 'ready' ? 0.2 : 0)) * 100),
  };
}

export function fmtBytes(n?: number) {
  if (!n) return '—';
  return n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;
}
