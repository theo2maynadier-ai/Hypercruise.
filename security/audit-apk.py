#!/usr/bin/env python3
"""Offline static inspection of a release APK. No claim of tamper resistance."""
import sys,zipfile,re
from pathlib import Path
if len(sys.argv)!=2: raise SystemExit('Usage: python3 security/audit-apk.py output/Hypercruise-0.8.25.apk')
f=Path(sys.argv[1]); assert f.is_file(),f
with zipfile.ZipFile(f) as z:
 names=z.namelist()
 js=[n for n in names if n.endswith('.js') and not '/vendor/' in n]
 dex=[n for n in names if re.fullmatch(r'classes\d*\.dex',n)]
 print('APK:',f.name,'bytes:',f.stat().st_size)
 print('DEX:',len(dex),'First-party JavaScript assets:',len(js))
 for n in js:
  raw=z.read(n)
  lines=raw.count(b'\n')+1
  print(f'  {n}: {len(raw):,} bytes, {lines:,} lines')
 print('WARNING: JS assets are extractable regardless of R8.')
 print('WARNING: ZIP audit alone cannot verify debuggable manifest or signing.')
 if not dex: raise SystemExit('FAIL: no classes.dex')
