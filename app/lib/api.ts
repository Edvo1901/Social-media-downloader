export type Info = {
  id: string;
  title: string | null;
  uploader: string | null;
  duration: number | null;
  thumbnail: string | null;
  stream_url: string | null;
};

export type Job = {
  status: 'queued' | 'downloading' | 'done' | 'failed';
  percent: number;
  error: string | null;
  path: string | null;
  skipped: boolean;
};

let base: Promise<string> | null = null;
const baseUrl = () => (base ??= window.electron.getBackendPort().then((p) => `http://127.0.0.1:${p}`));

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch((await baseUrl()) + path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data as T;
}

export const getInfo = (url: string) => call<Info>('/info', { url });
export const startDownload = (url: string, folder: string) =>
  call<{ job_id: string }>('/download', { url, folder });
export const getJob = (id: string) => call<Job>(`/jobs/${id}`);
