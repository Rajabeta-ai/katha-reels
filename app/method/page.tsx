import { BEATS, HOOK_TYPES, CLIFFHANGER_TYPES, FORMAT, QC_CHECKS, SERIES_ARC, REVERENCE_RULES } from '@/lib/microdrama';

export default function MethodPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-3xl font-extrabold">Reel ka dhaancha — the China model, applied to katha</h1>
      <p className="mt-3 text-[14.5px] leading-[1.85] text-neutral-400">
        Chinese vertical microdrama (<span className="font-semibold text-neutral-200">短剧 / duanju</span>) is now an
        ~$11B category built on a very small number of rules. This studio encodes those rules directly — the
        script engine writes to them, the QC pass measures against them, and the monitor renders off the same
        constants. Nothing here is vibes.
      </p>

      <Section title="1. Episode architecture" sub="Har episode ka dhaancha">
        <div className="space-y-2">
          {BEATS.map((b) => (
            <div key={b.kind} className={`beat-${b.kind} rounded-xl border p-4 beat-soft`}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="beat-text text-base font-extrabold">{b.label_en}</span>
                <span className="hi text-[11px] font-bold uppercase tracking-widest text-neutral-400">{b.label_hi}</span>
                <span className="ml-auto font-mono text-[11px] text-neutral-500">
                  {Math.round(b.share[0] * 100)}%–{Math.round(b.share[1] * 100)}% · ≈{(b.share[0] * FORMAT.targetDurationSec.ideal).toFixed(0)}s–{(b.share[1] * FORMAT.targetDurationSec.ideal).toFixed(0)}s
                </span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-400">{b.rule}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-neutral-500">
          The Hook is what Chinese showrunners call the <span className="text-neutral-300">bào diǎn (爆点)</span> — the
          detonation. You open mid-crisis; if a stranger needs backstory to parse the first three seconds, the reel
          is dead. The Button is the product: you cut <em>before</em> resolution, every single time.
        </p>
      </Section>

      <Section title="2. Hook taxonomy" sub="Detonation ke types — duanju trope ↔ katha equivalent">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-left text-[10px] uppercase tracking-widest text-neutral-500">
              <tr className="border-b border-[var(--color-line)]">
                <th className="py-2 pr-4">Hindi</th><th className="py-2 pr-4">English</th>
                <th className="py-2 pr-4">Duanju</th><th className="py-2">Udaaharan</th>
              </tr>
            </thead>
            <tbody>
              {HOOK_TYPES.map((h) => (
                <tr key={h.id} className="border-b border-[var(--color-line)]/60">
                  <td className="hi py-2 pr-4 font-bold text-[var(--color-sindoor)]">{h.hi}</td>
                  <td className="py-2 pr-4 text-neutral-300">{h.en}</td>
                  <td className="py-2 pr-4 text-neutral-500">{h.duanju}</td>
                  <td className="hi py-2 text-neutral-400">{h.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="3. Cliffhanger types" sub="Cut kahaan lagega — ek hi type lagataar do baar nahi">
        <div className="grid gap-2 sm:grid-cols-2">
          {CLIFFHANGER_TYPES.map((c) => (
            <div key={c.id} className="card rounded-lg px-4 py-2.5">
              <div className="text-[14px] font-semibold text-emerald-400">{c.en}</div>
              <div className="hi text-[11px] text-neutral-500">{c.hi}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="4. Series arc" sub="Adhyaay ke saare episodes milkar">
        <div className="space-y-2">
          {SERIES_ARC.map((a) => (
            <div key={a.phase} className="flex gap-4 rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-4 py-3">
              <span className="w-12 shrink-0 font-mono text-[12px] text-[var(--color-gold)]">{Math.round(a.at * 100)}%</span>
              <div>
                <div className="text-[13px] font-bold uppercase tracking-wide text-neutral-300">{a.phase}</div>
                <div className="text-[13px] leading-relaxed text-neutral-400">{a.note}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="5. Format spec" sub="Jo har reel mein tay hai">
        <div className="grid gap-2 sm:grid-cols-2 text-[13px]">
          <Spec k="Resolution" v={`${FORMAT.width} × ${FORMAT.height} (${FORMAT.aspect})`} />
          <Spec k="Frame rate" v={`${FORMAT.fps} fps · H.264 high · yuv420p · AAC 192k`} />
          <Spec k="Runtime" v={`${FORMAT.targetDurationSec.min}–${FORMAT.targetDurationSec.max}s (target ${FORMAT.targetDurationSec.ideal}s)`} />
          <Spec k="Shot length" v="≤ 6s — longer reads as a slideshow and loses the scroll" />
          <Spec k="Safe area" v={`top ${FORMAT.safeTopPx}px / bottom ${FORMAT.safeBottomPx}px kept clear of IG & Shorts chrome`} />
          <Spec k="Hindi VO pace" v={`${FORMAT.hindiWordsPerSecond} words/sec — beats are sized to this`} />
          <Spec k="Captions" v="libass + harfbuzz (Devanagari shaping), Kohinoor Devanagari, ≤7 words per card" />
          <Spec k="Narration" v="ElevenLabs multilingual v2, one continuous take per episode" />
        </div>
      </Section>

      <Section title="6. Automated QC" sub="Har reel par apne aap chalta hai">
        <div className="space-y-1.5">
          {QC_CHECKS.map((q) => (
            <div key={q.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-4 py-2.5 text-[13px]">
              <span className={`text-[9px] font-bold uppercase tracking-widest ${q.severity === 'blocker' ? 'text-rose-500' : 'text-amber-500'}`}>
                {q.severity}
              </span>
              <span className="text-neutral-300">{q.label}</span>
              <code className="ml-auto font-mono text-[10px] text-neutral-600">{q.id}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="7. Reverence guardrails" sub="Bhakti content ke rules">
        <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-neutral-400">
          {REVERENCE_RULES.map((r) => <li key={r} className="flex gap-2"><span className="text-[var(--color-gold)]">·</span>{r}</li>)}
        </ul>
      </Section>

      <Section title="Sources" sub="Format par research">
        <ul className="space-y-1.5 text-[13px] text-neutral-400">
          {[
            ['Duanju — Wikipedia', 'https://en.wikipedia.org/wiki/Duanju'],
            ['How to Write a Vertical Drama Script — Filmustage', 'https://filmustage.com/blog/how-to-write-a-vertical-drama-script/'],
            ['Vertical Drama Explained (2026) — Filmustage', 'https://filmustage.com/blog/vertical-drama-explained-what-you-need-to-know-in-2026/'],
            ['Love, twist and one-minute cliffhangers — Global Times', 'https://www.globaltimes.cn/page/202507/1339625.shtml'],
            ['Microdrama Explained: The $11B Revolution — Dreamsquare', 'https://dreamsquare.com/blog/microdrama-explained/'],
            ['Welcome to the Micro-Drama Nation — The World of Chinese', 'https://www.theworldofchinese.com/2025/09/welcome-to-the-micro-drama-nation-china/'],
          ].map(([t, u]) => (
            <li key={u}><a href={u} target="_blank" rel="noreferrer" className="text-[var(--color-lotus)] hover:underline">{t} ↗</a></li>
          ))}
        </ul>
      </Section>
    </main>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <div className="mb-4 mt-0.5 text-[12px] text-neutral-500">{sub}</div>
      {children}
    </section>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-4 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{k}</div>
      <div className="mt-0.5 text-neutral-300">{v}</div>
    </div>
  );
}
