'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJob } from './useJob';

const TRADITIONS = ['इतिहास', 'पुराण', 'नीतिकथा', 'लोककथा'] as const;
const TRADITION_LABEL: Record<string, string> = {
  'इतिहास': 'Itihasa (epic)', 'पुराण': 'Purana', 'नीतिकथा': 'Niti-katha (fable)', 'लोककथा': 'Folk tale',
};

export default function AddStoryForm() {
  const router = useRouter();
  const [f, setF] = useState({
    title_hi: '', title_en: '', tradition: 'पुराण', audience: 'both',
    sourceText_hi: '', sourceEdition: '', sourceUrl: '', emoji: '📖',
    chapterCount: 0, notes: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  const { job, track, busy } = useJob(() => { if (slug) router.push(`/story/${slug}`); });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: k === 'chapterCount' ? Number(e.target.value) : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch('/api/stories', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...f, chapterCount: f.chapterCount || undefined }),
    });
    const j = await res.json();
    if (!res.ok) return setErr(j.error ?? 'Kuch galat ho gaya');
    setSlug(j.slug);
    track(j.jobId);
  }

  const input = 'w-full rounded-lg border border-[var(--color-line)] bg-black/30 px-3 py-2 text-[14px] outline-none focus:border-[var(--color-gold)]';
  const label = 'mb-1 block text-[10px] font-bold uppercase tracking-widest text-neutral-500';

  return (
    <form onSubmit={submit} className="mt-8 max-w-2xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Katha ka naam (Hindi) *</label>
          <input required value={f.title_hi} onChange={set('title_hi')} placeholder="हनुमान चालीसा कथा" className={`${input} hi`} />
        </div>
        <div>
          <label className={label}>English title</label>
          <input value={f.title_en} onChange={set('title_en')} placeholder="Hanuman Chalisa Katha" className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Tradition</label>
          <select value={f.tradition} onChange={set('tradition')} className={input}>
            {TRADITIONS.map((t) => <option key={t} value={t}>{TRADITION_LABEL[t]}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Audience</label>
          <select value={f.audience} onChange={set('audience')} className={input}>
            <option value="both">Sabke liye</option>
            <option value="kids">Bachon ke liye (U)</option>
            <option value="adults">Adults (U/A)</option>
          </select>
        </div>
        <div>
          <label className={label}>Emoji</label>
          <input value={f.emoji} onChange={set('emoji')} maxLength={4} className={input} />
        </div>
      </div>

      <div>
        <label className={label}>Source granth (Hindi) *</label>
        <input required value={f.sourceText_hi} onChange={set('sourceText_hi')} placeholder="श्रीरामचरितमानस" className={`${input} hi`} />
        <p className="mt-1 text-[11px] text-neutral-500">
          The model cites this in every chapter reference, so name the actual text — not a retelling.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Edition / translator</label>
          <input value={f.sourceEdition} onChange={set('sourceEdition')} placeholder="गीता प्रेस गोरखपुर" className={input} />
        </div>
        <div>
          <label className={label}>Source URL</label>
          <input value={f.sourceUrl} onChange={set('sourceUrl')} placeholder="https://…" className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div>
          <label className={label}>Kitne adhyaay?</label>
          <select value={f.chapterCount} onChange={set('chapterCount')} className={input}>
            <option value={0}>Auto (5–16)</option>
            {[4, 5, 6, 8, 10, 12, 14, 16].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Notes for the writer</label>
          <input value={f.notes} onChange={set('notes')} placeholder="Sundarkand par zyada focus, yudh kam" className={input} />
        </div>
      </div>

      {err && <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">{err}</div>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn btn-gold">
          {busy ? 'Adhyaay ban rahe hain…' : '✦ Adhyaay banaiye'}
        </button>
        {job && (
          <span className="text-[12px] text-neutral-400">
            {job.status === 'failed' ? <span className="text-rose-400">{job.error}</span> : job.step}
          </span>
        )}
      </div>

      <p className="text-[12px] leading-relaxed text-neutral-500">
        This writes chapters only — summaries, canonical references and hooks. No reels are generated
        and nothing is spent on images or voice until you open a chapter and press <strong>Reels banaiye</strong>.
      </p>
    </form>
  );
}
