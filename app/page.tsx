'use client';
import { useState } from 'react';
import Downloader from './components/Downloader';
import Settings from './components/Settings';

const VIEWS = { x: 'X', instagram: 'Instagram', facebook: 'Facebook', settings: 'Settings' } as const;
type View = keyof typeof VIEWS;

export default function Page() {
  const [view, setView] = useState<View>('x');
  return (
    <div className="layout">
      <nav className="sidebar">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <button key={v} className={v === view ? 'active' : ''} onClick={() => setView(v)}>
            {VIEWS[v]}
          </button>
        ))}
      </nav>
      <main className="main">
        {/* One mounted Downloader keeps rows/polling alive across tabs and Settings. */}
        <div style={{ display: view === 'settings' ? 'none' : 'block' }}>
          <Downloader platform={view === 'settings' ? 'X' : VIEWS[view]} />
        </div>
        {view === 'settings' && <Settings />}
      </main>
    </div>
  );
}
