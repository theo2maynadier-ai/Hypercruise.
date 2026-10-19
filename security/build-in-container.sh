#!/usr/bin/env bash
set -euo pipefail
cd /work
export HYPER_SDK=/opt/android-sdk HYPER_HARDENED=1 HYPER_REQUIRE_SIGNING_KEY=1
if [[ ! -s signing/hypercruise.p12 || ! -s signing/password.txt ]]; then
  echo 'Missing persistent signing key in mounted signing directory.' >&2
  exit 2
fi
bash build.sh
