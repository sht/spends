"""Local-only development launcher. Never accepts a database or server URL."""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / '.dev'
PYTHON = ROOT / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
NPM = 'npm.cmd' if os.name == 'nt' else 'npm'


def environment():
    # Override inherited production settings; dev always uses this checkout's data.
    env = os.environ.copy()
    env.update(DATABASE_URL=f'sqlite+aiosqlite:///{DATA / "spends_tracker.db"}',
               UPLOADS_DIR=str(DATA / 'uploads'), BACKUPS_DIR=str(DATA / 'backups'),
               HOST='127.0.0.1', PORT='3031', DEBUG='true',
               VITE_HOST='127.0.0.1', VITE_PORT='3030',
               VITE_API_URL='http://127.0.0.1:3031')
    return env


def run(args, cwd=ROOT):
    subprocess.run([str(arg) for arg in args], cwd=cwd, env=environment(), check=True)


def prepare():
    if not PYTHON.exists():
        raise SystemExit('Run python3.12 scripts/dev.py setup first.')
    for path in (DATA, DATA / 'uploads', DATA / 'backups'):
        path.mkdir(parents=True, exist_ok=True)
    run([PYTHON, '-m', 'alembic', 'upgrade', 'head'], ROOT / 'backend')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['setup', 'start', 'backend', 'seed', 'test'])
    args = parser.parse_args()
    if args.command == 'setup':
        if sys.version_info[:2] != (3, 12) and not PYTHON.exists():
            raise SystemExit('Python 3.12 required for initial setup. Run python3.12 scripts/dev.py setup.')
        if not PYTHON.exists():
            run([sys.executable, '-m', 'venv', ROOT / '.venv'])
        run([PYTHON, '-m', 'pip', 'install', '--require-hashes', '-r', ROOT / 'backend/requirements-dev.txt'])
        run([NPM, 'ci'])
        prepare()
        run([PYTHON, ROOT / 'dev/seed.py'])
        print('Development setup ready. Run npm run dev.')
        return
    prepare()
    if args.command == 'seed':
        run([PYTHON, ROOT / 'dev/seed.py'])
    elif args.command == 'test':
        run([PYTHON, '-m', 'pytest'], ROOT / 'backend')
    elif args.command == 'backend':
        run([PYTHON, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '3031', '--reload'], ROOT / 'backend')
    else:
        children = []
        try:
            children.append(subprocess.Popen([str(PYTHON), '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '3031', '--reload'], cwd=ROOT / 'backend', env=environment()))
            children.append(subprocess.Popen([NPM, 'run', 'dev:frontend', '--', '--strictPort'], cwd=ROOT, env=environment()))
            while all(child.poll() is None for child in children):
                time.sleep(0.25)
            raise SystemExit(next(child.returncode for child in children if child.returncode is not None))
        except KeyboardInterrupt:
            pass
        finally:
            for child in children:
                if child.poll() is None:
                    child.terminate()
            for child in children:
                try:
                    child.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait()


if __name__ == '__main__':
    main()
