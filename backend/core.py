import os
import re

_BAD = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
_LOGIN = ("login", "log in", "private", "sign in", "cookies")


def build_filename(uploader, id):
    name = _BAD.sub("", uploader or "").strip() or "unknown"
    return f"{name}-{_BAD.sub('', str(id))}.mp4"


def target_path(folder, uploader, id):
    return os.path.join(folder, build_filename(uploader, id))


def should_skip(path):
    return os.path.isfile(path) and os.path.getsize(path) > 0


def friendly_error(exc):
    msg = _ANSI.sub("", str(exc)).strip()
    if any(k in msg.lower() for k in _LOGIN):
        return "Login required: this post is not public"
    return re.sub(r"^ERROR:\s*", "", msg)
