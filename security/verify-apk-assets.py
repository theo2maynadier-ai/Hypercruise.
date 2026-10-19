#!/usr/bin/env python3
"""Compare first-party JavaScript in final APK against verified staging output."""
import hashlib
import sys
import zipfile
from pathlib import Path

if len(sys.argv) != 3:
    sys.exit('Usage: verify-apk-assets.py APK STAGING_DIRECTORY')
apk, staging = Path(sys.argv[1]), Path(sys.argv[2])
if not apk.is_file() or not staging.is_dir():
    sys.exit('FAIL: missing APK or staged assets')
expected = {str(p.relative_to(staging)).replace('\\', '/'): p for p in staging.rglob('*.js') if 'vendor' not in p.relative_to(staging).parts}
if not expected:
    sys.exit('FAIL: no first-party JS in staging')
errors=[]
with zipfile.ZipFile(apk) as z:
    names=set(z.namelist())
    for name, file in expected.items():
        entry='assets/'+name
        if entry not in names:
            errors.append('Missing APK asset: '+entry)
        elif hashlib.sha256(z.read(entry)).digest()!=hashlib.sha256(file.read_bytes()).digest():
            errors.append('APK asset differs from staged output: '+entry)
    for entry in names:
        if entry.endswith(('.js.map','.css.map','.ts','.tsx','.jsx')) or entry.startswith(('assets/security/','assets/signing/')):
            errors.append('Development artifact embedded: '+entry)
        if entry.startswith('assets/') and entry.endswith('.js') and not entry.startswith('assets/vendor/'):
            if entry[7:] not in expected:
                errors.append('Unexpected first-party JS: '+entry)
            if b'sourceMappingURL=' in z.read(entry):
                errors.append('Source map reference embedded: '+entry)
if errors:
    print('\n'.join('FAIL: '+e for e in errors));sys.exit(1)
print(f'PASS: {len(expected)} first-party JS assets match the transformed staging directory exactly')
