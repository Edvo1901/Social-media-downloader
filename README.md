# Social Media Downloader

Personal Windows desktop app to download public videos from X, Instagram and Facebook.
Electron + Next.js UI, Python (FastAPI + yt-dlp) backend. X videos come from the
FxTwitter API (no login needed), with yt-dlp as fallback.

## Using the app

1. Pick **X**, **Instagram** or **Facebook** in the left menu (it only changes the label; any supported link works).
2. Paste one or more links, one per line, and click **Load**. Each link becomes a row with a preview.
3. Click **Download** on a row, or **Download all**. Two videos download at a time.
4. **Remove** drops a row from the list; **Delete all** clears the list.
5. Set the download folder in **Settings**. It is remembered between launches
   (stored in `%APPDATA%\social-media-downloader\settings.json`, not in the app folder).

Files are saved as `<uploader>-<id>.mp4`. If the file already exists it is skipped
("Done (already existed)"). Each finished row shows where the file was saved.

## First-time setup (new computer)

Needs Node.js, pnpm and Python 3.11+.

```
pnpm install
pnpm setup:backend
```

`setup:backend` creates `backend\.venv` and installs the Python packages.

## Running from source (for trying changes)

```
pnpm dev
```

Opens the app with live reload for the UI (`app\`). After changing `backend\` or
`electron\`, close the window and run `pnpm dev` again.

## Building the app

Close the app first (Windows can't replace files that are in use), then:

```
pnpm build:win
```

The app is built into `dist\win-unpacked`. Run `SocialMediaDownloader.exe` inside it, or
copy the whole folder anywhere (desktop, USB stick) and run it from there. To update a
copy, replace its folder with the new `win-unpacked`. The first launch after a build is
slower (~9 s) while Windows Defender scans the new files; after that it opens in ~1.5 s.

## Tests

```
backend\.venv\Scripts\python -m pytest backend/tests -q
pnpm exec tsc --noEmit
```

## Troubleshooting

- **A site stopped working:** sites change often. Update yt-dlp, then rebuild:
  `backend\.venv\Scripts\python -m pip install -U yt-dlp`
- **"Login required":** Instagram and Facebook hide many posts from logged-out users.
- **"Account suspended":** X suspended the account; its videos can't be downloaded.
- **Explorer shows the old icon:** Windows icon cache. Restart Explorer or sign out and back in.

## Project layout

- `app\` – Next.js UI (static export loaded by Electron)
- `electron\` – window, settings, starts/stops the backend
- `backend\` – FastAPI server: `main.py` (endpoints, downloads), `core.py` (filenames, errors)
- `build\` – app icon
