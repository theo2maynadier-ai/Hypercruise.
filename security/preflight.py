#!/usr/bin/env python3
"""Offline source and toolchain preflight. Does not claim an APK was built."""
from pathlib import Path
import os,sys,shutil,subprocess
root=Path(__file__).resolve().parents[1]
issues=[]
for rel in ['build.sh','app/AndroidManifest.xml','app/assets/index.html','app/assets/core.js','security/r8-rules.pro','security/obfuscate-assets.cjs','security/release-gate.py']:
 if not (root/rel).is_file():issues.append('Missing '+rel)
for cmd in ['java','javac','node','python3']:
 if not shutil.which(cmd):issues.append('Missing command '+cmd)
for path in (root/'app/assets').rglob('*'):
 if path.is_file() and path.suffix in {'.map','.pem','.p12','.jks','.keystore'}:issues.append('Sensitive or debug asset '+str(path.relative_to(root)))
for rel in ['build.sh','compile-docker.sh','security/build-in-container.sh']:
 p=root/rel
 if p.exists():
  r=subprocess.run(['bash','-n',str(p)],capture_output=True,text=True)
  if r.returncode:issues.append('Invalid shell syntax '+rel+': '+r.stderr)
print('Source preflight:', 'PASS' if not issues else 'FAIL')
for issue in issues:print(' -',issue)
sdk=os.environ.get('HYPER_SDK','')
if sdk:
 print('Android SDK:',sdk)
else:
 print('Android SDK not configured: APK compilation requires Android build tools.')
sys.exit(bool(issues))
