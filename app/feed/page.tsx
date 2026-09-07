import { Suspense } from 'react';
import FeedClient from '@/components/FeedClient';

export const dynamic = 'force-dynamic';

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-neutral-500">Load ho raha hai…</div>}>
      <FeedClient />
    </Suspense>
  );
}
