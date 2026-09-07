import type { Story } from '../catalog-types';
import { ramayana } from './ramayana';
import { mahabharata } from './mahabharata';
import { panchatantra } from './panchatantra';
import { krishna } from './krishna';
import { shiva } from './shiva';
import { betaal } from './betaal';
import { listCustomStories } from '../store';

/** Shipped with the repo. Edited as code. */
export const BUILT_IN: Story[] = [ramayana, mahabharata, krishna, shiva, panchatantra, betaal];

/**
 * Everything the app knows about — built-ins plus stories added through the UI.
 *
 * This is a function, not a constant, because custom stories live in the store
 * and a module-level constant would freeze them at first import and never show a
 * story added afterwards.
 */
export function catalog(): Story[] {
  return [...BUILT_IN, ...listCustomStories()];
}

export function isCustom(slug: string) {
  return listCustomStories().some((s) => s.slug === slug);
}

export function getStory(slug: string) {
  return catalog().find((s) => s.slug === slug);
}

export function getChapter(id: string) {
  for (const s of catalog()) {
    const c = s.chapters.find((ch) => ch.id === id);
    if (c) return { story: s, chapter: c };
  }
  return null;
}

export type { Story, Chapter } from '../catalog-types';
