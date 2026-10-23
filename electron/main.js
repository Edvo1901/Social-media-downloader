const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

let backend = null;
let port = 0;

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const defaults = () => ({ downloadDir: app.getPath('downloads') });

function readSettings() {
  try {
    return { ...defaults(), ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch {
    return defaults();
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
    srv.on('error', reject);
  });
}

function startBackend() {
  const args = ['--port', String(port)];
  backend = app.isPackaged
    ? spawn(path.join(process.resourcesPath, 'backend', 'backend.exe'), args, { windowsHide: true })
    : spawn(path.join(__dirname, '..', 'backend', '.venv', 'Scripts', 'python.exe'),
        [path.join(__dirname, '..', 'backend', 'main.py'), ...args], { windowsHide: true });
  backend.on('error', (e) => console.error('backend spawn failed', e));
}

function stopBackend() {
  if (backend && backend.pid) {
    try { execFileSync('taskkill', ['/pid', String(backend.pid), '/T', '/F']); } catch {}
    backend = null;
  }
}

function ping() {
  return new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port, path: '/health' }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

async function waitHealthy() {
  for (let i = 0; i < 180; i++) {
    if (await ping()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function registerAppProtocol() {
  const root = path.join(app.getAppPath(), 'out');
  protocol.handle('app', (req) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/' || p === '') p = '/index.html';
    const file = path.normalize(path.join(root, p));
    if (file !== root && !file.startsWith(root + path.sep)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

ipcMain.handle('settings:get', () => readSettings());
ipcMain.handle('settings:set', (_e, s) => {
  const next = { ...readSettings(), ...s };
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(next, null, 2));
  return next;
});
ipcMain.handle('dialog:pickFolder', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory'], defaultPath: readSettings().downloadDir });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('backend:port', () => port);

app.whenReady().then(async () => {
  port = await freePort();
  startBackend();
  if (app.isPackaged) registerAppProtocol();
  if (!(await waitHealthy())) {
    dialog.showErrorBox('Backend failed to start', 'The download backend did not respond within 90 seconds.');
    stopBackend();
    app.quit();
    return;
  }
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.setMenuBarVisibility(false);
  win.loadURL(app.isPackaged ? 'app://-/index.html' : 'http://localhost:3000');
});

app.on('before-quit', stopBackend);
app.on('window-all-closed', () => {
  stopBackend();
  app.quit();
});
