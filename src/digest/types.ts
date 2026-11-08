export type RunStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type DigestNight = {
  rows: DigestRow[];
  badLines: number;
};

// Signature committed first so route/view/test work can proceed against it.
export type ReadNight = (runsDir: string, night: string) => DigestNight;
