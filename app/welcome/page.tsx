import PasswordLogin from '@/components/PasswordLogin';

// Public showcase for the hosted studio: sample reels, how the pipeline works, and the
// password box. Everything else on the site sits behind proxy.ts.

const SAMPLE_REELS = [
  { ep: 1, title: 'अर्जुन को हटाओ', en: 'Get Arjuna out of the way', file: 'chakravyuh-ep01', secs: 67 },
  { ep: 2, title: 'सात घेरे', en: 'Seven rings', file: 'chakravyuh-ep02', secs: 71 },
  { ep: 3, title: 'मैं जानता हूँ', en: 'I know the way in', file: 'chakravyuh-ep03', secs: 79 },
];

const STEPS = [
  { kind: 'hook', title: 'Pick a chapter', body: '48 chapters across 6 works, each with a Hindi summary, its canonical source edition and pre-identified dramatic hooks.' },
  { kind: 'friction', title: 'Plan the series', body: 'An LLM writes the series spine: the arc across episodes, each hook, and the open question every episode hands to the next.' },
  { kind: 'escalation', title: 'Write each episode', body: 'Five beats per episode: hook, friction, escalation, spike, cut. 12 hook types and 8 cliffhanger types, never the same cliffhanger twice in a row.' },
  { kind: 'spike', title: 'Check it', body: '11 automated QC checks on every reel; 6 are blockers, such as "the hook lands by 3 s" and "the episode cuts before resolution". Every beat stays editable.' },
  { kind: 'button', title: 'Produce it', body: 'Gemini stills, Veo image-to-video motion shots, one continuous ElevenLabs Hindi narration, and an ffmpeg render to 1080×1920 with correctly shaped Devanagari captions.' },
];

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <section className="mb-10 max-w-3xl">
        <h1 className="text-4xl font-extrabold leading-tight">
          AI micro-drama studio for <span className="text-[var(--color-gold)]">Indian mythology</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-neutral-400">
          Turns a chapter of the Mahabharata or Ramayana into a series of Hindi 9:16 episodes, with a hook in the first
          3 seconds and a cliffhanger at the end. Written, illustrated, narrated and rendered by AI, and checked by an
          automated QC pass.
        </p>
        <p className="mt-3 text-[13px] text-neutral-500">
          Built by{' '}
          <a href="https://rajabeta-ai.github.io" className="text-[var(--color-gold)] hover:underline">Ankit Banerjee</a>
          {' · '}
          <a href="https://github.com/Rajabeta-ai/katha-reels" className="text-[var(--color-gold)] hover:underline">Source on GitHub</a>
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-extrabold">Sample series: Abhimanyu and the Chakravyuh</h2>
        <p className="mt-1 text-[13px] text-neutral-500">Mahabharata, Drona Parva · three episodes as the studio rendered them</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {SAMPLE_REELS.map((r) => (
            <figure key={r.file} className="card overflow-hidden rounded-2xl">
              <video
                src={`/showcase/${r.file}.mp4`}
                poster={`/showcase/${r.file}.jpg`}
                controls
                playsInline
                preload="metadata"
                className="aspect-[9/16] w-full bg-black object-cover"
              />
              <figcaption className="p-4">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Episode {r.ep} · {r.secs}s</div>
                <div className="hi mt-1 text-lg font-extrabold">{r.title}</div>
                <div className="text-[12px] text-neutral-500">{r.en}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-extrabold">How it works</h2>
        <ol className="mt-5 space-y-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className={`beat-${s.kind} beat-soft rounded-xl border p-4`}>
              <div className="flex items-baseline gap-3">
                <span className="beat-text font-mono text-sm font-extrabold">{i + 1}</span>
                <span className="beat-text text-base font-extrabold">{s.title}</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-400">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-xl">
        <h2 className="text-xl font-extrabold">Open the studio</h2>
        <p className="mb-4 mt-1 text-[13px] text-neutral-500">The studio runs on paid AI APIs, so it is password-protected.</p>
        <PasswordLogin next={next} />
      </section>
    </main>
  );
}
