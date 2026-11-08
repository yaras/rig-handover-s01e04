import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestNight, DigestRow, ReadNight, RunStatus } from './types.js';

type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner?: string | null;
  error?: string;
};

function isRunStatus(value: unknown): value is RunStatus {
  return value === 'ok' || value === 'retry' || value === 'fail';
}

function parseRunLine(raw: string): RunLine | null {
  try {
    const data = JSON.parse(raw) as Partial<RunLine>;
    if (typeof data?.at !== 'string') return null;
    if (typeof data?.job !== 'string') return null;
    if (!isRunStatus(data?.status)) return null;
    if (data.owner !== undefined && data.owner !== null && typeof data.owner !== 'string') return null;
    if (data.error !== undefined && typeof data.error !== 'string') return null;
    return {
      at: data.at,
      job: data.job,
      status: data.status,
      owner: data.owner ?? null,
      error: data.error,
    };
  } catch {
    return null;
  }
}

export const readNight: ReadNight = (runsDir, night) => {
  const text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of lines) {
    const parsed = parseRunLine(line);
    if (!parsed) {
      badLines += 1;
      continue;
    }

    const current = byJob.get(parsed.job);
    if (!current) {
      byJob.set(parsed.job, {
        job: parsed.job,
        owner: parsed.owner ?? null,
        runs: 1,
        retries: parsed.status === 'retry' ? 1 : 0,
        lastStatus: parsed.status,
        lastError: parsed.error ?? null,
        firstAt: parsed.at,
        lastAt: parsed.at,
      });
      continue;
    }

    current.runs += 1;
    if (parsed.status === 'retry') current.retries += 1;
    if (parsed.at < current.firstAt) current.firstAt = parsed.at;
    if (parsed.at >= current.lastAt) {
      current.lastAt = parsed.at;
      current.lastStatus = parsed.status;
      current.lastError = parsed.error ?? null;
      current.owner = parsed.owner ?? null;
    }
  }

  return {
    rows: Array.from(byJob.values()).sort((a, b) => a.job.localeCompare(b.job)),
    badLines,
  } satisfies DigestNight;
};
