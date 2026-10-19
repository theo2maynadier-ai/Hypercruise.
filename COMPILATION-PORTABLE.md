# Compilation portable Hypercruise 0.8.25

Prerequisites: Docker, Java JDK (keytool), Python 3 and internet access **on the machine running Docker**.

Run `bash compile-docker.sh` from this directory. The script builds a Docker image with Android SDK 35 and Terser, creates a persistent signing key on first run, builds the hardened APK, and outputs `output/Hypercruise-0.8.25.apk` only if checks pass.

**Never share the project ZIP, `signing/`, `password.txt`, the private keystore or the R8 mapping.** Back up `signing/` privately to preserve future update compatibility. Do not upload this source archive to a public GitHub repository.

This cannot run in the current restricted session because Android SDK binaries are absent and the Google download domain cannot resolve. This Docker setup is a reproducible route on a connected machine, not evidence that an APK has been compiled or tested on-device.
