import Link from 'next/link';
import AddStoryForm from '@/components/AddStoryForm';
import { listCustomStories } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function AddStoryPage() {
  const custom = listCustomStories();
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/" className="text-xs text-neutral-500 hover:text-[var(--color-gold)]">← Kathayein</Link>
      <h1 className="mt-4 text-3xl font-extrabold">Nayi katha jodiye</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-neutral-400">
        Name a work and its source text. The model breaks it into chapters — each with a Hindi summary,
        a canonical reference and its own pre-identified hooks — and it then behaves exactly like the
        six that ship with the app.
      </p>

      <AddStoryForm />

      {custom.length > 0 && (
        <section className="mt-14 border-t border-[var(--color-line)] pt-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Aapki jodi hui kathayein</h2>
          <div className="mt-4 space-y-2">
            {custom.map((s) => (
              <div key={s.slug} className="card flex items-center gap-3 rounded-lg px-4 py-3">
                <span className="text-xl">{s.emoji}</span>
                <Link href={`/story/${s.slug}`} className="hi font-semibold hover:text-[var(--color-gold)]">{s.title_hi}</Link>
                <span className="chip">{s.chapters.length} adhyaay</span>
                <span className="chip">{s.chapters.reduce((n, c) => n + c.suggestedReels, 0)} reels</span>
                <span className="ml-auto font-mono text-[11px] text-neutral-600">{s.slug}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
