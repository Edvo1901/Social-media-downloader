export {};

declare global {
  interface Window {
    electron: {
      getSettings: () => Promise<{ downloadDir: string }>;
      setSettings: (s: { downloadDir: string }) => Promise<{ downloadDir: string }>;
      pickFolder: () => Promise<string | null>;
      getBackendPort: () => Promise<number>;
    };
  }
}
