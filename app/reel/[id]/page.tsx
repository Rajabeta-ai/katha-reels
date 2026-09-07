import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findReel } from '@/lib/store';
import { getChapter } from '@/lib/catalog';
import ReelMonitor from '@/components/ReelMonitor';

export const dynamic = 'force-dynamic';

export default async function ReelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = findReel(id);
  if (!found) notFound();
  const ctx = getChapter(found.series.chapterId);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <Link href={`/story/${found.series.storySlug}`} className="hi hover:text-[var(--color-gold)]">{ctx?.story.title_hi}</Link>
        <span>/</span>
        <Link href={`/chapter/${found.series.chapterId}`} className="hi hover:text-[var(--color-gold)]">{ctx?.chapter.title_hi}</Link>
        <span>/</span>
        <span className="text-neutral-300">Episode {found.reel.episode}</span>
      </div>
      <ReelMonitor initial={found.reel} chapterId={found.series.chapterId} seriesId={found.series.id} />
    </main>
  );
}
