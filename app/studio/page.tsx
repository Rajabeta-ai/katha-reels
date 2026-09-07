import Link from 'next/link';
import { listSeries } from '@/lib/store';
import { getChapter } from '@/lib/catalog';
import { qcScore } from '@/lib/qc';

export const dynamic = 'force-dynamic';

export default function StudioPage() {
  const series = listSeries();
  const allReels = series.flatMap((s) => s.reels);
  const rendered = allReels.filter((r) => r.render.status === 'ready');
  const totalSec = rendered.reduce((n, r) => n + r.durationSec, 0);
  const blockers = allReels.reduce((n, r) => n + r.qc.filter((q) => !q.pass && q.severity === 'blocker').length, 0);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">Studio</h1>
        {rendered.length > 0 && (
          <a href="/api/download-all" download className="btn btn-gold ml-auto">
            ⤓ Sab download ({rendered.length} reels)
          </a>
        )}
      </div>
      <p className="mt-1 text-[13px] text-neutral-500">Har series, har episode, har asset ka status ek jagah.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Series" value={series.length} />
        <Stat label="Episodes" value={allReels.length} />
        <Stat label="Render hue" value={rendered.length} />
        <Stat label="Total runtime" value={`${Math.floor(totalSec / 60)}m ${Math.round(totalSec % 60)}s`} />
      </div>
      {blockers > 0 && (
        <div className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/20 px-4 py-3 text-[13px] text-rose-300">
          {blockers} QC blockers khule hain — post karne se pehle un episodes ka QC tab dekhiye.
        </div>
      )}

      {series.length === 0 ? (
        <div className="mt-10 text-center text-neutral-500">
          <p>Abhi koi series nahi bani.</p>
          <Link href="/" className="btn btn-gold mt-4">Koi adhyaay chuniye</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {series.map((s) => {
            const ctx = getChapter(s.chapterId);
            return (
              <div key={s.id} className="card rounded-xl p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/chapter/${s.chapterId}`} className="hi text-lg font-bold hover:text-[var(--color-gold)]">
                    {ctx?.chapter.title_hi}
                  </Link>
                  <span className="chip hi">{ctx?.story.title_hi}</span>
                  <span className="chip">{s.mode === 'kids' ? 'Bachon ka' : 'Adults'}</span>
                  <span className="chip">{s.reels.length} episodes</span>
                  {s.status === 'generating' && <span className="chip text-sky-400">Ban rahi hai…</span>}
                  <span className="ml-auto font-mono text-[11px] text-neutral-600">{new Date(s.createdAt).toLocaleString('en-IN')}</span>
                  {s.reels.some((r) => r.render.status === 'ready') && (
                    <a href={`/api/download-all?series=${s.id}`} download
                       className="text-[11px] text-neutral-500 hover:text-[var(--color-gold)]">⤓ ZIP</a>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.reels.map((r) => {
                    const q = qcScore(r.qc);
                    const done = r.render.status === 'ready';
                    return (
                      <Link key={r.id} href={`/reel/${r.id}`}
                        title={`${r.title_hi} · QC ${q.score}%`}
                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-mono transition ${
                          done ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300'
                          : q.blockers ? 'border-rose-900/60 bg-rose-950/20 text-rose-300'
                          : 'border-[var(--color-line)] text-neutral-400 hover:border-[var(--color-gold)]'}`}>
                        EP{String(r.episode).padStart(2, '0')}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card rounded-xl p-4">
      <div className="text-2xl font-black text-[var(--color-gold)]">{value}</div>
      <div className="mt-0.5 text-[11px] text-neutral-500">{label}</div>
    </div>
  );
}
