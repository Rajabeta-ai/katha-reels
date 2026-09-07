import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Katha Reels — Devotional Microdrama Studio',
  description: 'Hindi 9:16 microdrama reels from Ramayana, Mahabharata, Puranas and Panchatantra.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body className="min-h-screen aura">
        <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-ink)]/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="hi text-xl font-extrabold text-[var(--color-gold)]">कथा</span>
              <span className="text-xl font-extrabold tracking-tight">Reels</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="rounded-md px-3 py-1.5 text-neutral-400 hover:bg-white/5 hover:text-white">Kathayein</Link>
              <Link href="/studio" className="rounded-md px-3 py-1.5 text-neutral-400 hover:bg-white/5 hover:text-white">Studio</Link>
              <Link href="/feed" className="rounded-md px-3 py-1.5 text-neutral-400 hover:bg-white/5 hover:text-white">Feed</Link>
              <Link href="/method" className="rounded-md px-3 py-1.5 text-neutral-400 hover:bg-white/5 hover:text-white">Method</Link>
              <Link href="/add-story" className="rounded-md px-3 py-1.5 text-[var(--color-gold)] hover:bg-white/5">+ Katha</Link>
            </nav>
            <div className="ml-auto text-[11px] font-medium text-neutral-500">9:16 · 1080×1920 · Hindi</div>
          </div>
        </header>
        {children}
        <footer className="mx-auto max-w-7xl px-5 py-10 text-[11px] leading-relaxed text-neutral-600">
          Source granth: Valmiki Ramayana (Baroda Critical Edition) · Mahabharata (BORI Critical Edition) · Bhagavata Purana ·
          Shiva Mahapurana · Panchatantra · Kathasaritsagara. Kathayein Hindi mein dramatise ki gayi hain, cited editions ke according.
        </footer>
      </body>
    </html>
  );
}
