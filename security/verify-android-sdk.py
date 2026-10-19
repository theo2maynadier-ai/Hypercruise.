#!/usr/bin/env python3
"""Fail fast when the Android 35 platform or aapt2 installation is corrupt."""
from pathlib import Path
import subprocess
import sys
import zipfile


def fail(message: str) -> None:
    raise SystemExit(f"FAIL Android SDK 35: {message}")


if len(sys.argv) != 2:
    raise SystemExit("Usage: python3 security/verify-android-sdk.py /path/to/android-sdk")

sdk = Path(sys.argv[1]).resolve()
platform = sdk / "platforms/android-35/android.jar"
aapt2 = sdk / "build-tools/35.0.0/aapt2"

if not platform.is_file() or platform.stat().st_size < 1_000_000:
    fail(f"missing or truncated {platform}")
if not aapt2.is_file():
    fail(f"missing {aapt2}")

try:
    with zipfile.ZipFile(platform) as archive:
        names = set(archive.namelist())
        if "resources.arsc" not in names or "android/Manifest.class" not in names:
            fail("android.jar is missing required platform entries")
        bad = archive.testzip()
        if bad:
            fail(f"CRC error in android.jar entry {bad}")
except zipfile.BadZipFile as exc:
    fail(f"android.jar is not a valid ZIP: {exc}")

probe = subprocess.run(
    [str(aapt2), "dump", "resources", str(platform)],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.PIPE,
    text=True,
)
if probe.returncode:
    detail = probe.stderr.strip().splitlines()
    fail("aapt2 cannot parse android.jar" + (f": {detail[-1]}" if detail else ""))

print("Android SDK 35 platform integrity: PASS")

