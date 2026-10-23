'use client';
import { useEffect, useState } from 'react';

export default function Settings() {
  const [dir, setDir] = useState('');

  useEffect(() => {
    window.electron.getSettings().then((s) => setDir(s.downloadDir));
  }, []);

  async function change() {
    const picked = await window.electron.pickFolder();
    if (picked) setDir((await window.electron.setSettings({ downloadDir: picked })).downloadDir);
  }

  return (
    <div>
      <h2>Settings</h2>
      <p>Download folder: <strong>{dir}</strong></p>
      <button className="primary" onClick={change}>Change…</button>
    </div>
  );
}
