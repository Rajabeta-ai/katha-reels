'use client';
import { useEffect, useState } from 'react';

type Cfg = { scriptProvider: string; scriptReady: boolean; model: string; elevenlabs: boolean; imageProvider: string; veo: boolean };

export default function SetupBanner() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  useEffect(() => { fetch('/api/config').then((r) => r.json()).then(setCfg).catch(() => {}); }, []);
  if (!cfg) return null;

  const missing: string[] = [];
  if (!cfg.scriptReady) missing.push('script provider key');
  if (cfg.imageProvider === 'none') missing.push('IMAGE_PROVIDER');
  if (!cfg.elevenlabs) missing.push('ELEVENLABS_API_KEY');

  return (
    <div className="mb-8 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white/[0.02] px-4 py-3 text-[12px]">
      <Pill on={cfg.scriptReady} label={`Script · ${cfg.model}`} />
      <Pill on={cfg.imageProvider !== 'none'} label={`Visuals · ${cfg.imageProvider}`} />
      <Pill on={cfg.elevenlabs} label="Voice · ElevenLabs" />
      <Pill on={cfg.veo} label="Veo motion" optional />
      {missing.length > 0 && (
        <span className="ml-auto text-neutral-500">
          <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px]">.env.local</code>  mein chahiye: {missing.join(' · ')}
        </span>
      )}
    </div>
  );
}

function Pill({ on, label, optional }: { on: boolean; label: string; optional?: boolean }) {
  return (
    <span className={`chip ${on ? 'border-emerald-700/60 text-emerald-400' : optional ? 'text-neutral-600' : 'border-amber-800/60 text-amber-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-emerald-400' : optional ? 'bg-neutral-700' : 'bg-amber-500'}`} />
      {label}
    </span>
  );
}
