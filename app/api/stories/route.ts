import { NextResponse } from 'next/server';
import { generateChapters, type StoryBrief } from '@/lib/ai/script';
import { listCustomStories, upsertCustomStory, deleteCustomStory } from '@/lib/store';
import { BUILT_IN } from '@/lib/catalog';
import { createJob, background, step } from '@/lib/jobs';
import type { Story } from '@/lib/catalog-types';

export const maxDuration = 800;

const GRADIENTS = [
  'from-rose-500 via-red-700 to-rose-900',
  'from-lime-500 via-green-700 to-emerald-900',
  'from-cyan-500 via-sky-700 to-blue-900',
  'from-fuchsia-500 via-purple-700 to-indigo-900',
  'from-orange-400 via-amber-600 to-yellow-800',
];

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export async function GET() {
  return NextResponse.json({ stories: listCustomStories().map((s) => ({ slug: s.slug, title_hi: s.title_hi, chapters: s.chapters.length })) });
}

export async function DELETE(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  deleteCustomStory(slug);
  return NextResponse.json({ ok: true });
}

/** Adds a new work: the model breaks it into chapters, then it behaves like any built-in story. */
export async function POST(req: Request) {
  const brief = (await req.json()) as StoryBrief;
  if (!brief?.title_hi || !brief?.sourceText_hi) {
    return NextResponse.json({ error: 'title_hi and sourceText_hi are required' }, { status: 400 });
  }

  const base = slugify(brief.title_en || brief.title_hi) || `story-${Date.now().toString(36)}`;
  const taken = new Set([...BUILT_IN, ...listCustomStories()].map((s) => s.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  const job = createJob('story', 1);
  background(job, async (jobId) => {
    step(jobId, `"${brief.title_hi}" ko adhyaay mein toda ja raha hai…`, 0, 1);
    const out = await generateChapters(brief);

    const story: Story = {
      slug,
      title_hi: brief.title_hi,
      title_en: brief.title_en || brief.title_hi,
      tradition: (brief.tradition as Story['tradition']) || 'लोककथा',
      audience: (brief.audience as Story['audience']) || 'both',
      emoji: brief.emoji || '📖',
      gradient: brief.gradient || GRADIENTS[taken.size % GRADIENTS.length],
      source: {
        text_hi: brief.sourceText_hi,
        edition: brief.sourceEdition || '—',
        url: brief.sourceUrl || '',
      },
      summary_hi: out.summary_hi,
      themes_hi: out.themes_hi,
      chapters: out.chapters
        .sort((a, b) => a.index - b.index)
        .map((c, i) => ({
          id: `${slug}-${String(i + 1).padStart(2, '0')}`,
          index: i + 1,
          title_hi: c.title_hi,
          title_en: c.title_en,
          canonicalRef: c.canonicalRef,
          summary_hi: c.summary_hi,
          keyCharacters: c.keyCharacters,
          suggestedReels: Math.min(12, Math.max(4, c.suggestedReels)),
          ageRating: c.ageRating,
          hookSeeds: c.hookSeeds as Story['chapters'][number]['hookSeeds'],
        })),
    };

    upsertCustomStory(story);
    return { slug, chapters: story.chapters.length };
  });

  return NextResponse.json({ jobId: job.id, slug });
}
