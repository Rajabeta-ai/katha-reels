import fs from 'node:fs';
import path from 'node:path';
import type { Db, Series, Reel } from './types';

// On a host with a mounted disk (Render, Fly), point KATHA_DATA_DIR at the mount
// so the store and every generated asset survive a redeploy.
const DATA_DIR = process.env.KATHA_DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

export const ASSET_DIR = path.join(DATA_DIR, 'assets');
export const RENDER_DIR = path.join(DATA_DIR, 'renders');

function ensure() {
  for (const d of [DATA_DIR, ASSET_DIR, RENDER_DIR]) fs.mkdirSync(d, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ series: [] }, null, 2));
}

export function read(): Db {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as Db;
  } catch {
    return { series: [] };
  }
}

/** Atomic write — temp file then rename, so a crash mid-write can't truncate the db. */
export function write(db: Db) {
  ensure();
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

export function listCustomStories() {
  return read().customStories ?? [];
}

export function upsertCustomStory(story: import('./catalog-types').Story) {
  const db = read();
  db.customStories ??= [];
  const i = db.customStories.findIndex((s) => s.slug === story.slug);
  if (i >= 0) db.customStories[i] = story;
  else db.customStories.push(story);
  write(db);
}

export function deleteCustomStory(slug: string) {
  const db = read();
  db.customStories = (db.customStories ?? []).filter((s) => s.slug !== slug);
  write(db);
}

export function listSeries(): Series[] {
  return read().series.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function seriesForChapter(chapterId: string): Series | undefined {
  return read().series.find((s) => s.chapterId === chapterId);
}

export function getSeries(id: string): Series | undefined {
  return read().series.find((s) => s.id === id);
}

export function findReel(reelId: string): { series: Series; reel: Reel } | null {
  for (const s of read().series) {
    const r = s.reels.find((x) => x.id === reelId);
    if (r) return { series: s, reel: r };
  }
  return null;
}

export function upsertSeries(s: Series) {
  const db = read();
  const i = db.series.findIndex((x) => x.id === s.id);
  if (i >= 0) db.series[i] = s;
  else db.series.push(s);
  write(db);
}

export function deleteSeries(id: string) {
  const db = read();
  db.series = db.series.filter((s) => s.id !== id);
  write(db);
}

/** Mutate one reel in place and persist. Read-modify-write on a single small file. */
export function updateReel(reelId: string, fn: (r: Reel) => void): Reel | null {
  const db = read();
  for (const s of db.series) {
    const r = s.reels.find((x) => x.id === reelId);
    if (r) {
      fn(r);
      write(db);
      return r;
    }
  }
  return null;
}

export function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
