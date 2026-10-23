# Social Media Downloader

Personal Windows app to download public videos from X, Instagram and Facebook (via yt-dlp).

## Prerequisites
Node.js, pnpm, Python 3.11+.

## Commands
```
pnpm install
pnpm setup:backend     # creates backend/.venv and installs Python deps
pnpm dev               # Next dev server + Electron
pnpm build:win         # app folder in dist/win-unpacked: copy it anywhere, run SocialMediaDownloader.exe
backend\.venv\Scripts\python -m pytest backend/tests -q
```

## Notes
- If a site stops working, update yt-dlp (`backend\.venv\Scripts\python -m pip install -U yt-dlp`) and rebuild.
- Instagram and Facebook often require login; those posts show "Login required: this post is not public".
- Files are saved as `<uploader>-<id>.mp4`; existing non-empty files are skipped.
