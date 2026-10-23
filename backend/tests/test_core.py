import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import core


def test_sanitise():
    assert core.build_filename('a<b>:"/\\|?*c\x01', "1") == "abc-1.mp4"


def test_fallback():
    assert core.build_filename("", "9") == "unknown-9.mp4"
    assert core.build_filename(None, "9") == "unknown-9.mp4"


def test_skip(tmp_path):
    p = tmp_path / "x.mp4"
    assert not core.should_skip(str(p))
    p.write_bytes(b"")
    assert not core.should_skip(str(p))
    p.write_bytes(b"1")
    assert core.should_skip(str(p))
    assert core.target_path(str(tmp_path), "u", "1") == str(tmp_path / "u-1.mp4")


def test_errors():
    assert core.friendly_error(Exception("ERROR: Sign in to confirm")).startswith("Login required")
    assert core.friendly_error(Exception("this video is private")).startswith("Login required")
    assert core.friendly_error(Exception("\x1b[0;31mERROR:\x1b[0m boom")) == "boom"
    assert core.friendly_error(Exception("ERROR: [twitter] 1: Account suspended")).startswith("Account suspended")
