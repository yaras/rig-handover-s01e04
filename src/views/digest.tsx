import type { DigestNight } from '../digest/types.js';

function statusClass(lastStatus: string, retries: number): string | undefined {
  return lastStatus === 'fail' || retries >= 3 ? 'warn' : undefined;
}

export function DigestPage({ night, digest }: { night: string; digest: DigestNight }) {
  if (digest.rows.length === 0) {
    return (
      <>
        <h1>digest · {night}</h1>
        <p class="mute">nothing ran</p>
      </>
    );
  }

  return (
    <>
      <h1>digest · {night}</h1>
      {digest.badLines > 0 ? (
        <p class="warn">{digest.badLines} bad line{digest.badLines === 1 ? '' : 's'} ignored</p>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last status</th>
            <th>last error</th>
            <th>first at</th>
            <th>last at</th>
          </tr>
        </thead>
        <tbody>
          {digest.rows.map((row) => (
            <tr class={statusClass(row.lastStatus, row.retries)}>
              <td>{row.job}</td>
              <td>{row.owner ?? '—'}</td>
              <td>{row.runs}</td>
              <td>{row.retries}</td>
              <td>{row.lastStatus}</td>
              <td>{row.lastError ?? '—'}</td>
              <td>{row.firstAt}</td>
              <td>{row.lastAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
