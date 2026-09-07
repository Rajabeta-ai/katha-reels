import { QC_CHECKS, FORMAT } from './microdrama';
import type { Reel, QcResult } from './types';

const EXPOSITION_TELLS = [
  'बहुत समय पहले', 'प्राचीन काल', 'एक समय की बात', 'कहते हैं कि', 'सदियों पहले',
  'त्रेता युग में', 'द्वापर युग में', 'आइए जानते हैं', 'इस कहानी में',
];

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function runQc(reel: Reel): QcResult[] {
  const out: QcResult[] = [];
  const push = (id: string, pass: boolean, note: string) => {
    const def = QC_CHECKS.find((c) => c.id === id)!;
    out.push({ id, pass, severity: def.severity, label: def.label, note });
  };

  const beats = [...reel.beats].sort((a, b) => a.startSec - b.startSec);
  const shots = [...reel.shots].sort((a, b) => a.startSec - b.startSec);
  const hook = beats.find((b) => b.kind === 'hook');
  const button = beats.find((b) => b.kind === 'button');
  const spike = beats.find((b) => b.kind === 'spike');

  push('hook_under_3s',
    !!hook && hook.startSec <= 0.01 && hook.endSec <= 3.5,
    hook ? `Hook runs 0–${hook.endSec}s` : 'No hook beat found');

  push('has_button',
    !!button && button.endSec >= reel.durationSec - 0.5,
    button ? `Button closes at ${button.endSec}s of ${reel.durationSec}s` : 'No button beat — this reel resolves instead of cutting');

  const d = reel.durationSec;
  push('duration_in_range',
    d >= FORMAT.targetDurationSec.min && d <= FORMAT.targetDurationSec.max,
    `${d}s`);

  // Hindi VO must physically fit the beat it sits in.
  const overruns = beats
    .map((b) => {
      const span = b.endSec - b.startSec;
      const need = words(b.vo_hi) / FORMAT.hindiWordsPerSecond;
      return { kind: b.kind, span, need: Math.round(need * 10) / 10, ratio: need / Math.max(span, 0.1) };
    })
    .filter((x) => x.ratio > 1.15 || x.ratio < 0.4);
  push('vo_fits',
    overruns.length === 0,
    overruns.length ? overruns.map((o) => `${o.kind}: ${o.need}s of VO in ${o.span}s`).join(' · ') : 'all beats fit');

  push('mute_legible',
    !!spike && spike.direction_hi.length > 25,
    spike ? `${spike.direction_hi.slice(0, 70)}…` : 'no spike beat');

  const opening = `${hook?.vo_hi ?? ''} ${hook?.onScreenText_hi ?? ''}`;
  const tell = EXPOSITION_TELLS.find((t) => opening.includes(t));
  push('no_cold_exposition', !tell, tell ? `Opens with "${tell}" — cold exposition` : 'opens mid-crisis');

  push('loop_opened', reel.openLoop_hi.trim().length > 8, reel.openLoop_hi || '—');
  push('loop_closed',
    reel.episode === 1 || reel.closesLoop_hi.trim().length > 8,
    reel.episode === 1 ? 'ep 1 — opens cold by design' : reel.closesLoop_hi || '—');

  // Shots must tile the runtime edge to edge.
  let gap = '';
  if (!shots.length) gap = 'no shots';
  else {
    if (shots[0].startSec > 0.05) gap = `starts at ${shots[0].startSec}s`;
    for (let i = 1; i < shots.length && !gap; i++) {
      const delta = shots[i].startSec - shots[i - 1].endSec;
      if (Math.abs(delta) > 0.25) gap = `${delta > 0 ? 'gap' : 'overlap'} of ${Math.abs(round(delta))}s at shot ${i + 1}`;
    }
    const end = shots[shots.length - 1].endSec;
    if (!gap && Math.abs(end - reel.durationSec) > 0.5) gap = `shots end at ${end}s, reel is ${reel.durationSec}s`;
  }
  push('shots_cover', !gap, gap || `${shots.length} shots tile ${reel.durationSec}s`);

  const longest = shots.reduce((m, s) => Math.max(m, s.endSec - s.startSec), 0);
  push('shot_pace', longest <= 6.01, `longest shot ${round(longest)}s`);

  const longText = beats.filter((b) => words(b.onScreenText_hi) > 7);
  push('text_safe_area',
    longText.length === 0,
    longText.length ? `${longText.length} card(s) over 7 words — will wrap into IG chrome` : 'all cards ≤7 words');

  return out;
}

export function qcScore(qc: QcResult[]) {
  if (!qc.length) return { score: 0, blockers: 0, warns: 0 };
  const blockers = qc.filter((q) => !q.pass && q.severity === 'blocker').length;
  const warns = qc.filter((q) => !q.pass && q.severity === 'warn').length;
  const score = Math.round((qc.filter((q) => q.pass).length / qc.length) * 100);
  return { score, blockers, warns };
}

const round = (n: number) => Math.round(n * 100) / 100;
