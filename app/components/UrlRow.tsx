'use client';
import { useState } from 'react';
import type { Info } from '../lib/api';

export type Row = {
  key: number;
  url: string;
  info?: Info;
  status: 'loading' | 'ready' | 'queued' | 'downloading' | 'done' | 'failed';
  percent: number;
  error?: string;
  skipped?: boolean;
};

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function statusText(r: Row) {
  switch (r.status) {
    case 'loading': return 'Loading info…';
    case 'ready': return 'Ready';
    case 'queued': return 'Queued';
    case 'downloading': return `Downloading ${Math.round(r.percent)}%`;
    case 'done': return r.skipped ? 'Done (already existed)' : 'Done';
    case 'failed': return `Failed: ${r.error}`;
  }
}

export default function UrlRow({ row, onDownload }: { row: Row; onDownload: () => void }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const { info } = row;
  return (
    <div className="row">
      <div className="media">
        {info && info.stream_url && !videoFailed ? (
          <video controls preload="metadata" src={info.stream_url} poster={info.thumbnail ?? undefined} onError={() => setVideoFailed(true)} />
        ) : (
          info?.thumbnail && <img src={info.thumbnail} alt="" referrerPolicy="no-referrer" />
        )}
      </div>
      <div className="meta">
        <h3>{info?.title ?? '(no preview)'}</h3>
        <div>{info?.uploader}{info?.duration != null && ` · ${mmss(info.duration)}`}</div>
        <div className="url">{row.url}</div>
        <div className={`status ${row.status}`}>{statusText(row)}</div>
        {row.status !== 'done' && (
          <button className="primary" onClick={onDownload} disabled={row.status !== 'ready' && row.status !== 'failed' || !info}>
            Download
          </button>
        )}
      </div>
    </div>
  );
}
