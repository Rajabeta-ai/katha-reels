import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getChapter } from '@/lib/catalog';
import { seriesForChapter } from '@/lib/store';
import { HOOK_TYPES } from '@/lib/microdrama';
import ChapterStudio from '@/components/ChapterStudio';

export const dynamic = 'force-dynamic';

export default async function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getChapter(id);
  if (!found) notFound();
  const { story, chapter } = found;
  const series = seriesForChapter(id) ?? null;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link href={`/story/${story.slug}`} className="text-xs text-neutral-500 hover:text-[var(--color-gold)]">
        ← {story.title_hi}
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip hi">{story.title_hi}</span>
          <span className="chip">Adhyaay {chapter.index}</span>
          <span className="chip">{chapter.ageRating}</span>
        </div>
        <h1 className="hi mt-3 text-3xl font-extrabold">{chapter.title_hi}</h1>
        <div className="mt-1 text-sm text-neutral-500">{chapter.title_en}</div>
        <div className="hi mt-2 text-[12px] text-[var(--color-gold-dim)]">
          {chapter.canonicalRef} — {story.source.text_hi}
        </div>
      </header>

      <section className="mt-7 grid gap-7 lg:grid-cols-[1fr_300px]">
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">Adhyaay saaransh</h2>
          <p className="hi text-[15.5px] leading-[1.9] text-neutral-200">{chapter.summary_hi}</p>

          <h2 className="mb-3 mt-8 text-xs font-bold uppercase tracking-widest text-neutral-500">
            Pehchaane gaye hooks — inhi se episodes banenge
          </h2>
          <div className="space-y-2">
            {chapter.hookSeeds.map((h, i) => {
              const t = HOOK_TYPES.find((x) => x.id === h.hookType);
              return (
                <div key={i} className="card rounded-lg px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-sindoor)]">
                    <span>{t?.en}</span>
                    <span className="text-neutral-600">{t?.duanju}</span>
                  </div>
                  <div className="hi text-[14px] leading-relaxed text-neutral-300">“{h.line_hi}”</div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card rounded-xl p-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Mukhya paatra</div>
            <div className="flex flex-wrap gap-1.5">
              {chapter.keyCharacters.map((c) => <span key={c} className="chip hi">{c}</span>)}
            </div>
          </div>
          {chapter.runtimeNote && (
            <div className="card rounded-xl border-amber-900/50 p-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">Director note</div>
              <div className="hi text-[12.5px] leading-relaxed text-amber-200/80">{chapter.runtimeNote}</div>
            </div>
          )}
        </aside>
      </section>

      <ChapterStudio chapterId={chapter.id} suggested={chapter.suggestedReels} initialSeries={series} />
    </main>
  );
}
