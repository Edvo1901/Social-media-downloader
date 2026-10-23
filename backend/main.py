import argparse
import os
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor

import imageio_ffmpeg
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from yt_dlp import YoutubeDL

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import core  # noqa: E402

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "app://-"], allow_methods=["*"], allow_headers=["*"])

jobs: dict[str, dict] = {}
pool = ThreadPoolExecutor(max_workers=2)


class InfoReq(BaseModel):
    url: str


class DownloadReq(BaseModel):
    url: str
    folder: str


def extract(url):
    with YoutubeDL({"quiet": True, "no_warnings": True, "noplaylist": True, "skip_download": True}) as ydl:
        return ydl.extract_info(url, download=False)


def stream_url(info):
    for f in reversed(info.get("formats") or []):
        if (
            f.get("protocol") == "https"
            and f.get("vcodec") not in (None, "none")
            and f.get("acodec") not in (None, "none")
            and f.get("url")
        ):
            return f["url"]
    return None


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/info")
def info(req: InfoReq):
    try:
        i = extract(req.url)
    except Exception as e:
        raise HTTPException(400, core.friendly_error(e))
    return {
        "id": str(i.get("id")),
        "title": i.get("title"),
        "uploader": i.get("uploader") or i.get("channel"),
        "duration": i.get("duration"),
        "thumbnail": i.get("thumbnail"),
        "stream_url": stream_url(i),
    }


def run_job(job_id, url, folder):
    job = jobs[job_id]
    try:
        i = extract(url)
        target = core.target_path(folder, i.get("uploader") or i.get("channel"), i.get("id"))
        if core.should_skip(target):
            job.update(status="done", percent=100, path=target, skipped=True)
            return
        job["status"] = "downloading"

        def hook(d):
            if d["status"] == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate")
                if total:
                    # shortcut: percent is per-stream (video then audio), not overall
                    job["percent"] = min(99.0, d["downloaded_bytes"] * 100 / total)

        os.makedirs(folder, exist_ok=True)
        opts = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "format": "bv*+ba/b",
            "merge_output_format": "mp4",
            "postprocessors": [{"key": "FFmpegVideoRemuxer", "preferedformat": "mp4"}],
            "outtmpl": os.path.splitext(target)[0] + ".%(ext)s",
            "ffmpeg_location": imageio_ffmpeg.get_ffmpeg_exe(),
            "progress_hooks": [hook],
        }
        with YoutubeDL(opts) as ydl:
            ydl.download([url])
        job.update(status="done", percent=100, path=target)
    except Exception as e:
        job.update(status="failed", error=core.friendly_error(e))


@app.post("/download")
def download(req: DownloadReq):
    job_id = uuid.uuid4().hex
    jobs[job_id] = {"status": "queued", "percent": 0, "error": None, "path": None, "skipped": False}
    pool.submit(run_job, job_id, req.url, req.folder)
    return {"job_id": job_id}


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Unknown job")
    return jobs[job_id]


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8765)
    uvicorn.run(app, host="127.0.0.1", port=p.parse_args().port, log_config=None)
