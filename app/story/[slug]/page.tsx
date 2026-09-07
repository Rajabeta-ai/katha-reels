import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStory } from '@/lib/catalog';
import { listSeries } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();

  const series = listSeries();
  const byChapter = new Map(series.map((s) => [s.chapterId, s]));

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/" className="text-xs text-neutral-500 hover:text-[var(--color-gold)]">← Saari kathayein</Link>

      <div className={`mt-4 overflow-hidden rounded-2xl bg-gradient-to-br ${story.gradient}`}>
        <div className="bg-black/35 p-8">
          <div className="text-6xl">{story.emoji}</div>
          <h1 className="hi mt-3 text-4xl font-extrabold">{story.title_hi}</h1>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{story.title_en}</div>
        </div>
      </div>

      <section className="mt-7 grid gap-6 md:grid-cols-[1fr_260px]">
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">Saaransh</h2>
          <p className="hi text-[15px] leading-[1.85] text-neutral-300">{story.summary_hi}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {story.themes_hi.map((t) => <span key={t} className="chip hi">{t}</span>)}
          </div>
        </div>
        <aside className="card rounded-xl p-4 text-[12px] leading-relaxed">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Source granth</div>
          <div className="hi font-semibold text-[var(--color-gold)]">{story.source.text_hi}</div>
          <div className="mt-1.5 text-neutral-400">{story.source.edition}</div>
          {story.source.translator && <div className="mt-1.5 text-neutral-500">{story.source.translator}</div>}
          <a href={story.source.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[var(--color-lotus)] hover:underline">
            Mool paath ↗
          </a>
        </aside>
      </section>

      <h2 className="mb-3 mt-10 text-xs font-bold uppercase tracking-widest text-neutral-500">
        Adhyaay — {story.chapters.length}
      </h2>
      <div className="space-y-3">
        {story.chapters.map((c) => {
          const s = byChapter.get(c.id);
          const ready = s?.reels.filter((r) => r.render.status === 'ready').length ?? 0;
          return (
            <Link key={c.id} href={`/chapter/${c.id}`} className="card block rounded-xl p-5 transition">
              <div className="flex items-start gap-4">
                <div className="hi mt-0.5 w-10 shrink-0 text-2xl font-black text-[var(--color-gold-dim)]">
                  {String(c.index).padStart(2, '0')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="hi text-lg font-bold">{c.title_hi}</h3>
                    <span className="chip">{c.ageRating}</span>
                    <span className="chip">{c.suggestedReels} reels</span>
                    {s && (
                      <span className="chip border-[var(--color-gold-dim)] text-[var(--color-gold)]">
                        {s.status === 'generating' ? 'Ban rahi hai…' : `${s.reels.length} likhi · ${ready} render`}
                      </span>
                    )}
                  </div>
                  <div className="hi mt-1 text-[11px] text-neutral-500">{c.canonicalRef}</div>
                  <p className="hi mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-neutral-400">{c.summary_hi}</p>
                </div>
                <div className="mt-1 shrink-0 text-neutral-600">→</div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
