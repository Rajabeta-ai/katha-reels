/**
 * Minimal declaration for archiver v7's CJS factory.
 *
 * The published @types package tracks v8 (ESM, no default export) and does not
 * describe v7's callable default, so this declares only the surface used here.
 */
declare module 'archiver' {
  import type { Readable } from 'node:stream';

  interface Archive extends Readable {
    file(source: string, opts: { name: string }): Archive;
    append(source: string | Buffer | Readable, opts: { name: string }): Archive;
    finalize(): Promise<void>;
    abort(): Archive;
    on(event: 'error' | 'warning', cb: (err: Error) => void): this;
  }

  function archiver(format: 'zip' | 'tar', options?: { zlib?: { level?: number }; store?: boolean }): Archive;
  export = archiver;
}
