"""Guard against inherited production settings leaking into local development."""
import importlib.util
from pathlib import Path


def test_dev_launcher_forces_local_data_and_api(monkeypatch):
    root = Path(__file__).resolve().parents[2]
    spec = importlib.util.spec_from_file_location('spends_dev_launcher', root / 'scripts/dev.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setenv('DATABASE_URL', 'sqlite+aiosqlite:////app/data/production.db')
    monkeypatch.setenv('UPLOADS_DIR', '/app/data/uploads')
    monkeypatch.setenv('BACKUPS_DIR', '/app/data/backups')
    monkeypatch.setenv('VITE_API_URL', 'https://home-server.example/api')
    env = module.environment()
    assert env['DATABASE_URL'] == f'sqlite+aiosqlite:///{root / ".dev/spends_tracker.db"}'
    assert env['UPLOADS_DIR'] == str(root / '.dev/uploads')
    assert env['BACKUPS_DIR'] == str(root / '.dev/backups')
    assert env['VITE_API_URL'] == 'http://127.0.0.1:3031'
