export type Job = {
  id: string;
  kind: string;
  status: 'running' | 'done' | 'failed';
  step: string;
  done: number;
  total: number;
  error?: string;
  startedAt: number;
  finishedAt?: number;
  result?: unknown;
};

// Survives Next.js dev hot-reloads, which would otherwise blow away the map
// mid-generation and orphan a running job.
const g = globalThis as unknown as { __kathaJobs?: Map<string, Job> };
const jobs = (g.__kathaJobs ??= new Map<string, Job>());

export function createJob(kind: string, total: number): Job {
  const job: Job = {
    id: `job_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    kind, status: 'running', step: 'Shuru ho raha hai…', done: 0, total, startedAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string) {
  return jobs.get(id);
}

export function step(id: string, step: string, done?: number, total?: number) {
  const j = jobs.get(id);
  if (!j) return;
  j.step = step;
  if (done !== undefined) j.done = done;
  if (total !== undefined) j.total = total;
}

export function finish(id: string, result?: unknown) {
  const j = jobs.get(id);
  if (!j) return;
  j.status = 'done';
  j.step = 'Ho gaya';
  j.done = j.total;
  j.finishedAt = Date.now();
  j.result = result;
}

export function fail(id: string, error: unknown) {
  const j = jobs.get(id);
  if (!j) return;
  j.status = 'failed';
  j.error = error instanceof Error ? error.message : String(error);
  j.finishedAt = Date.now();
}

/** Fire-and-forget with the job bookkeeping wired up. */
export function background(job: Job, fn: (jobId: string) => Promise<unknown>) {
  fn(job.id).then((r) => finish(job.id, r)).catch((e) => fail(job.id, e));
}
