"""Smoke-test a built production image using disposable containers and a new volume."""
import argparse
import json
import http.client
import subprocess
import time
import urllib.error
import urllib.request
import uuid


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()


def request(base, path, body=None, headers=None):
    payload = json.dumps(body).encode() if isinstance(body, dict) else body
    req = urllib.request.Request(base + path, data=payload,
        headers=headers or ({'Content-Type': 'application/json'} if body is not None else {}))
    with urllib.request.urlopen(req, timeout=5) as response:
        content = response.read()
        return json.loads(content) if 'application/json' in response.headers.get('Content-Type', '') else content


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image')
    args = parser.parse_args()
    name = 'spends-smoke-' + uuid.uuid4().hex[:12]
    volume = name + '-data'
    docker('volume', 'create', volume)
    try:
        docker('run', '--rm', '--entrypoint', 'python', args.image, '-c',
            "from pathlib import Path; p=Path('/app'); assert not list(p.rglob('*.db')); "
            "assert not list(p.rglob('seed.py')); assert not list(p.rglob('purchases.json')); "
            "assert not list(p.rglob('.env')); assert (p/'dist-modern/index.html').is_file()")
        purchase = None
        receipt = None
        for iteration in range(2):
            docker('run', '-d', '--name', name, '-p', '127.0.0.1::8000',
                   '--mount', f'type=volume,src={volume},dst=/app/data', args.image)
            address = docker('port', name, '8000/tcp').splitlines()[0]
            base = 'http://' + address
            for attempt in range(60):
                try:
                    request(base, '/api')
                    break
                except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.RemoteDisconnected):
                    if attempt == 59:
                        raise RuntimeError(docker('logs', name))
                    time.sleep(0.5)
            assert b'<div id="app">' in request(base, '/')
            items = request(base, '/api/purchases/?limit=1000')
            if iteration == 0:
                assert items['total'] == 0, items
                purchase = request(base, '/api/purchases/', {
                    'product_name': 'Persistence smoke test', 'price': '12.34',
                    'currency_code': 'EUR', 'purchase_date': '2025-01-01'})
                multipart = (b'--spends-test\r\nContent-Disposition: form-data; name="file_type"\r\n\r\nreceipt\r\n'
                    b'--spends-test\r\nContent-Disposition: form-data; name="file"; filename="receipt.txt"\r\n'
                    b'Content-Type: text/plain\r\n\r\npersistent receipt\r\n--spends-test--\r\n')
                receipt = request(base, f'/api/files/{purchase["id"]}/', multipart,
                                  {'Content-Type': 'multipart/form-data; boundary=spends-test'})
                request(base, '/api/export/backup/save', {})
                print('PASS: image excludes development data; fresh database is empty; UI/API/upload/backup work.', flush=True)
            else:
                assert items['total'] == 1
                assert items['items'][0]['id'] == purchase['id']
                assert request(base, f'/api/files/file/{receipt["id"]}/download/') == b'persistent receipt'
                assert request(base, '/api/export/backup/list')['total'] == 1
                print('PASS: purchase, receipt and backup survive container recreation; no samples inserted.', flush=True)
            docker('rm', '-f', name)
        # Unknown migration history must prevent app startup.
        docker('run', '--rm', '--mount', f'type=volume,src={volume},dst=/app/data',
               '--entrypoint', 'python', args.image, '-c',
               "import sqlite3; c=sqlite3.connect('/app/data/spends_tracker.db'); "
               "c.execute(\"UPDATE alembic_version SET version_num='unknown_smoke_revision'\"); c.commit()")
        result = subprocess.run(['docker', 'run', '--rm', '--mount',
            f'type=volume,src={volume},dst=/app/data', args.image, 'true'], capture_output=True, text=True, timeout=30)
        assert result.returncode != 0 and 'unknown_smoke_revision' in result.stderr, result
        print('PASS: migration failure stops startup.', flush=True)
    finally:
        subprocess.run(['docker', 'rm', '-f', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        docker('volume', 'rm', volume)


if __name__ == '__main__':
    main()
