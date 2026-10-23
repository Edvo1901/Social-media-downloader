'use client';
import { useEffect, useRef, useState } from 'react';
import { getInfo, getJob, startDownload } from '../lib/api';
import UrlRow, { type Row } from './UrlRow';

export default function Downloader({ platform }: { platform: string }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const rowsRef = useRef<Row[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setInterval>>());
  const nextKey = useRef(0);

  rowsRef.current = rows;
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearInterval);
  }, []);

  const patch = (key: number, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  function load() {
    const urls = text.split('\n').map((u) => u.trim()).filter(Boolean);
    const fresh: Row[] = urls.map((url) => ({ key: nextKey.current++, url, status: 'loading', percent: 0 }));
    setRows((rs) => [...rs, ...fresh]);
    setText('');
    fresh.forEach((r) =>
      getInfo(r.url).then(
        (info) => patch(r.key, { info, status: 'ready' }),
        (e: Error) => patch(r.key, { status: 'failed', error: e.message }),
      ),
    );
  }

  async function download(r: Row) {
    patch(r.key, { status: 'queued', percent: 0, error: undefined });
    try {
      const folder = (await window.electron.getSettings()).downloadDir;
      const { job_id } = await startDownload(r.url, folder);
      const timer = setInterval(async () => {
        try {
          const j = await getJob(job_id);
          patch(r.key, { status: j.status, percent: j.percent, error: j.error ?? undefined, skipped: j.skipped, path: j.path ?? undefined });
          if (j.status === 'done' || j.status === 'failed') {
            clearInterval(timer);
            timers.current.delete(timer);
          }
        } catch (e) {
          clearInterval(timer);
          timers.current.delete(timer);
          patch(r.key, { status: 'failed', error: (e as Error).message });
        }
      }, 1000);
      timers.current.add(timer);
    } catch (e) {
      patch(r.key, { status: 'failed', error: (e as Error).message });
    }
  }

  const downloadAll = () => rowsRef.current.filter((r) => r.status === 'ready').forEach(download);

  return (
    <div>
      <h2>{platform} downloader</h2>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`Paste ${platform} video URLs, one per line`} />
      <div className="actions">
        <button className="primary" onClick={load} disabled={!text.trim()}>Load</button>
        <button className="primary" onClick={downloadAll} disabled={!rows.some((r) => r.status === 'ready')}>Download all</button>
      </div>
      {rows.map((r) => (
        <UrlRow key={r.key} row={r} onDownload={() => download(r)} />
      ))}
    </div>
  );
}
