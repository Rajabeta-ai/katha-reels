'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Item = {
  id: string; seriesId: string; episode: number; title_hi: string; logline_hi: string; openLoop_hi: string;
  durationSec: number; storyTitle_hi: string; chapterTitle_hi: string; chapterId: string;
  caption_ig: string; hashtags: string[]; src: string;
};

export default function FeedClient() {
  const sp = useSearchParams();
  const seriesFilter = sp.get('series');
  const start = sp.get('start');

  const [items, setItems] = useState<Item[] | null>(null);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/feed${seriesFilter ? `?series=${seriesFilter}` : ''}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items));
  }, [seriesFilter]);

  // Only the visible reel plays. Everything else pauses and rewinds, so scrolling
  // back always restarts the hook.
  useEffect(() => {
    if (!items?.length) return;
    const root = container.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target.querySelector('video') as HTMLVideoElement | null;
          const i = Number((e.target as HTMLElement).dataset.i);
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            setActive(i);
            v?.play().catch(() => {});
          } else if (v) { v.pause(); v.currentTime = 0; }
        }
      },
      { root, threshold: [0, 0.6, 1] },
    );
    root.querySelectorAll('[data-i]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  useEffect(() => {
    if (!items || !start) return;
    const i = items.findIndex((x) => x.id === start);
    if (i > 0) container.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView();
  }, [items, start]);

  if (!items) return <div className="p-10 text-center text-neutral-500">Load ho raha hai…</div>;

  if (!items.length) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <div className="text-5xl">🎬</div>
        <h2 className="mt-4 text-2xl font-bold">Abhi koi reel render nahi hui</h2>
        <p className="hi mt-2 text-[14px] leading-relaxed text-neutral-500">
          Kisi adhyaay mein jaakar “Reels banaiye” chalaiye, phir episode par “Poori reel banaiye” dabaiye. Render hote hi wo yahaan aa jaayengi.
        </p>
        <Link href="/" className="btn btn-gold mt-6">Kathayein dekhiye</Link>
      </div>
    );
  }

  const cur = items[active];

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-5 py-6">
      <div
        ref={container}
        className="feed mx-auto h-[calc(100vh-140px)] w-full max-w-[400px] overflow-y-scroll rounded-2xl border border-[var(--color-line)] bg-black"
      >
        {items.map((it, i) => (
          <div key={it.id} data-i={i} className="snap relative h-full w-full">
            <video
              src={it.src}
              muted={muted}
              loop
              playsInline
              preload={Math.abs(i - active) <= 1 ? 'auto' : 'none'}
              className="h-full w-full object-cover"
              onClick={(e) => {
                const v = e.currentTarget;
                v.paused ? v.play().catch(() => {}) : v.pause();
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4">
              <div className="hi text-[11px] font-semibold text-white/70">{it.storyTitle_hi} · {it.chapterTitle_hi}</div>
              <div className="hi text-[15px] font-bold text-white drop-shadow">EP {it.episode} — {it.title_hi}</div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-16">
              <div className="hi text-[12.5px] leading-relaxed text-white/85">{it.logline_hi}</div>
              <div className="hi mt-1.5 text-[11px] text-[var(--color-gold)]">↪ {it.openLoop_hi}</div>
            </div>
            <button
              onClick={() => setMuted((m) => !m)}
              className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1.5 text-[11px] text-white backdrop-blur">
              {muted ? '🔇 Unmute' : '🔊'}
            </button>
          </div>
        ))}
      </div>

      <aside className="hidden w-80 shrink-0 space-y-4 lg:block">
        <div className="card rounded-xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Abhi chal raha hai</div>
          <div className="hi mt-1 text-lg font-bold">{cur?.title_hi}</div>
          <div className="hi mt-0.5 text-[12px] text-neutral-500">{cur?.storyTitle_hi} · {cur?.chapterTitle_hi} · EP {cur?.episode} · {cur?.durationSec}s</div>
          <div className="mt-4 flex gap-2">
            <a href={`${cur?.src}?dl=1`} download className="btn btn-gold flex-1 !text-[12px]">⤓ Download</a>
            <Link href={`/reel/${cur?.id}`} className="btn btn-ghost !text-[12px]">Breakdown</Link>
          </div>
          <a href={seriesFilter ? `/api/download-all?series=${seriesFilter}` : '/api/download-all'} download
             className="btn btn-ghost mt-2 w-full !text-[12px]">
            ⤓ {seriesFilter ? 'Poori series' : 'Saari reels'} ZIP
          </a>
        </div>

        <div className="card rounded-xl p-4">
          <div className="mb-2 flex items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Post karne ke liye caption</span>
            <button
              onClick={() => navigator.clipboard.writeText(`${cur?.caption_ig}\n\n${cur?.hashtags.join(' ')}`)}
              className="ml-auto text-[11px] text-neutral-500 hover:text-[var(--color-gold)]">Copy</button>
          </div>
          <div className="hi whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-300">{cur?.caption_ig}</div>
          <div className="mt-2 text-[11px] leading-relaxed text-[var(--color-lotus)]">{cur?.hashtags.join(' ')}</div>
        </div>

        <div className="text-center text-[11px] text-neutral-600">
          {active + 1} / {items.length} · scroll karke agla episode
        </div>
      </aside>
    </div>
  );
}
