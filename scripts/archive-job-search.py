"""Close, validate and atomically install a private checkpoint; unchanged input is a no-op."""
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import zipfile


def archive(source, target):
    source, target = Path(source).resolve(), Path(target).resolve()
    if source == target or source in target.parents:
        raise ValueError('Archive must be outside the runtime tree')
    files = sorted(p for p in source.rglob('*') if p.is_file() and p.name != 'run.lock')
    if not files:
        raise ValueError('Empty checkpoint')
    fingerprint = {str(p.relative_to(source)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    def valid(path):
        with zipfile.ZipFile(path) as z:
            if z.testzip() is not None:
                raise ValueError('Archive integrity failure')
            return {n: hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if not n.endswith('/')}
    if target.exists() and valid(target) == fingerprint:
        return {'changed': False, 'path': str(target)}
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=target.parent, suffix='.zip')
    os.close(fd)
    try:
        with zipfile.ZipFile(temp, 'w', zipfile.ZIP_DEFLATED) as z:
            for p in files:
                z.write(p, str(p.relative_to(source)))
        if valid(temp) != fingerprint:
            raise ValueError('Runtime changed during checkpoint creation; retry after writers finish')
        os.replace(temp, target)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)
    return {'changed': True, 'path': str(target), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}

if __name__ == '__main__':
    print(json.dumps(archive(*sys.argv[1:3])))
