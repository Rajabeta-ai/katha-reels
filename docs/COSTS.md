# Cost model — per reel

Measured from **EP 1 of `mb-12` (चक्रव्यूह — अभिमन्यु)**: 68s runtime, 16 stills at 2K,
2 Veo clips × 8s, 838 characters of Hindi VO, 6 cast reference sheets amortised across
a 9-episode chapter.

## Unit rates (Sept 2026)

| API | Unit | Rate |
|---|---|---|
| Claude Opus 5 | input / output tokens | $5.00 / $25.00 per 1M |
| Gemini 3 Pro Image | image @ 1K | $0.039 |
| Gemini 3 Pro Image | image @ **1K–2K** (what we use) | **$0.134** |
| Gemini 3 Pro Image | image @ 4K | $0.24 |
| Gemini image Batch API | any tier, 24h turnaround | **−50%** |
| Veo 3.1 standard | second of video (incl. audio) | $0.40 |
| Veo 3.1 fast | second | $0.15 |
| Veo 3.1 lite | second | $0.05 |
| ElevenLabs `eleven_v3` | 1,000 characters | $0.10 |
| ElevenLabs turbo/flash | 1,000 characters | $0.05 |
| ffmpeg render | per reel | $0 (local) |

> Veo pricing is the least certain figure here — sources quote both $0.40/s and $0.75/s
> for standard on the Gemini API. Treat the table below as a floor and check your own
> Google Cloud billing after the first chapter.

## Per reel

| Config | Claude | Images | Voice | Veo | **Per reel** | Per 9-ep chapter |
|---|---|---|---|---|---|---|
| Veo standard | $0.16 | $2.23 | $0.08 | $6.40 | **$8.88** | $79.90 |
| Veo fast | $0.16 | $2.23 | $0.08 | $2.40 | **$4.88** | $43.90 |
| Veo lite | $0.16 | $2.23 | $0.08 | $0.80 | **$3.28** | $29.50 |
| Veo off | $0.16 | $2.23 | $0.08 | — | **$2.48** | $22.30 |

**Veo is 72% of the bill.** Everything else combined is under $2.50.

Claude is a rounding error — $0.16 covers the whole episode script, all 16 shot prompts,
the beat breakdown and the publish copy.

## Levers, ranked

| Lever | Per reel | Saving | Cost of the trade |
|---|---|---|---|
| Veo standard → **fast** | $4.88 | **45%** | Slightly less coherent motion |
| Veo **off** | $2.48 | **72%** | Lose the two motion beats per episode |
| Stills at 1K not 2K | $7.29 | 18% | Ken Burns zoom visibly softens — not recommended |
| Images via **Batch API** | $7.76 | 13% | 24h turnaround; fine for scheduled content |
| TTS v3 → turbo | $8.84 | 0.5% | Not worth it — voice is already negligible |
| **Veo fast + Batch images** | **$3.76** | **58%** | 24h turnaround, marginally softer motion |

## Where the time goes

| Stage | Per reel |
|---|---|
| 16 stills @ ~29s each | ~8 min |
| 2 Veo clips @ ~89s each | ~3 min |
| Cast sheets (first episode of a chapter only) | ~3 min |
| ElevenLabs narration | ~10s |
| ffmpeg render | ~1 min |
| **Total** | **~13 min** (~1h 45m per chapter) |

## Recommendation

Run **Veo fast + Batch API images** at $3.76/reel for volume production, and reserve
Veo standard for the one or two episodes you expect to carry a chapter. At $3.76,
a 9-episode chapter is ~$34 and a 48-chapter catalogue is roughly $1,600.
