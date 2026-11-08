import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function makeRunsDir(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  tempDirs.push(root);
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(root, `${name}.jsonl`), content);
  }
  return root;
}

function appWithRuns(files: Record<string, string>) {
  const runsDir = makeRunsDir(files);
  const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };
  return createApp(config);
}

describe('digest routes', () => {
  it('renders digest page and JSON in the same job order', async () => {
    const app = appWithRuns({
      '2026-10-28': [
        '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}',
        '{"at":"2026-10-29T01:30:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
        '{"at":"2026-10-29T01:37:00+01:00","job":"fixtures/refresh","status":"ok","owner":"rook"}',
        '{"at":"2026-10-29T04:00:01+01:00","job":"notes/backup","status":"fail","owner":"lane-07","error":"quota exceeded"}',
        '{"at":"2026-10-29T05:41:09+01:00","job":"digest/render","status":"ok","owner":null}',
        '{"at":"2026-10-29T05:59:58+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
      ].join('\n'),
    });

    const page = await app.request('/digest/2026-10-28');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('digest · 2026-10-28');
    expect(html).toContain('>—<');

    const api = await app.request('/api/digest/2026-10-28');
    expect(api.status).toBe(200);
    const rows = await api.json();
    expect(rows.map((r: { job: string }) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('returns 404 for a night with no file', async () => {
    const app = appWithRuns({ '2026-10-28': '' });
    expect((await app.request('/digest/1999-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/1999-01-01')).status).toBe(404);
  });

  it('renders "nothing ran" for an empty night', async () => {
    const app = appWithRuns({ '2026-10-28': '' });
    const page = await app.request('/digest/2026-10-28');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('nothing ran');

    const api = await app.request('/api/digest/2026-10-28');
    expect(await api.json()).toEqual([]);
  });

  it('counts bad lines but still renders', async () => {
    const app = appWithRuns({
      '2026-10-28': [
        '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}',
        '{"at":"2026-10-29T05:59:58+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
        '{"at":"2026-10-29T06:00:00+01:00","job":"lane/sy',
      ].join('\n'),
    });

    const page = await app.request('/digest/2026-10-28');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('1 bad line ignored');

    const api = await app.request('/api/digest/2026-10-28');
    const rows = await api.json();
    expect(rows).toHaveLength(2);
  });
});
