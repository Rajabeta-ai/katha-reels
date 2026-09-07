import Link from 'next/link';
import { catalog } from '@/lib/catalog';
import { TRADITION_EN } from '@/lib/catalog-types';
import { listSeries } from '@/lib/store';
import SetupBanner from '@/components/SetupBanner';

export const dynamic = 'force-dynamic';

export default function Home() {
  const CATALOG = catalog();
  const series = listSeries();
  const madeFor = new Set(series.map((s) => s.chapterId));
  const rendered = series.reduce((n, s) => n + s.reels.filter((r) => r.render.status === 'ready').length, 0);

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <SetupBanner />

      <section className="mb-10">
        <h1 className="text-4xl font-extrabold leading-tight">
          Katha se reel tak — <span className="text-[var(--color-gold)]">microdrama</span> format mein
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-neutral-400">
          Chapter ka summary padhiye, adhyaay chuniye, aur use 60–90 second ke Hindi episodes mein todiye — har episode
          pehle 3 second mein hook karta hai aur aakhri 2 second mein cliffhanger par cut hota hai. AI storyboards,
          ElevenLabs narration, aur seedha 1080×1920 MP4 jo aap post kar sakte hain.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-neutral-400">
          <span className="chip">{CATALOG.length} kathayein</span>
          <span className="chip">{CATALOG.reduce((n, s) => n + s.chapters.length, 0)} adhyaay</span>
          <span className="chip">{series.length} series bani</span>
          <span className="chip">{rendered} reels render</span>
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOG.map((s) => {
          const made = s.chapters.filter((c) => madeFor.has(c.id)).length;
          return (
            <Link key={s.slug} href={`/story/${s.slug}`} className="card group overflow-hidden rounded-2xl transition">
              <div className={`relative h-40 bg-gradient-to-br ${s.gradient}`}>
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute left-5 top-4 text-5xl drop-shadow-lg">{s.emoji}</div>
                <div className="absolute bottom-3 left-5 right-5">
                  <div className="hi text-2xl font-extrabold drop-shadow">{s.title_hi}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-white/70">{s.title_en}</div>
                </div>
              </div>
              <div className="p-5">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="chip">{TRADITION_EN[s.tradition]}</span>
                  <span className="chip">{s.audience === 'kids' ? 'Bachon ke liye' : s.audience === 'adults' ? 'Adults' : 'Sabke liye'}</span>
                  <span className="chip">{s.chapters.length} adhyaay</span>
                  {made > 0 && <span className="chip border-[var(--color-gold-dim)] text-[var(--color-gold)]">{made} bani</span>}
                </div>
                <p className="hi line-clamp-3 text-[13px] leading-relaxed text-neutral-400">{s.summary_hi}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
