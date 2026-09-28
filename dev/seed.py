"""Fictional fixtures, explicitly loaded only into this checkout's .dev database."""
import asyncio
from datetime import date, timedelta
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from dev import DATA, environment

# This script cannot be pointed at a remote API or production database.
os.environ.update(environment())
os.chdir(ROOT / "backend")
sys.path.insert(0, str(ROOT / 'backend'))
from sqlalchemy import select
from app.database import AsyncSessionLocal, async_engine
from app.models import Purchase, Warranty, Retailer, Brand, Component, File, Setting
from app.models.file import FileType


async def seed():
    async with AsyncSessionLocal() as session:
        # Never merge samples into existing data, including an interrupted/manual seed.
        for model in (Purchase, Warranty, Retailer, Brand, Component, File, Setting):
            if (await session.execute(select(model).limit(1))).first():
                print('Dev database already contains data; leaving it untouched.')
                return
        async with session.begin_nested():
            retailer = Retailer(name='Example Shop', url='https://example.com')
            brand = Brand(name='Demo Works', url='https://example.com')
            session.add_all([retailer, brand])
            await session.flush()
            today = date.today()
            for entry in json.loads((ROOT / 'dev/purchases.json').read_text()):
                entry = dict(entry)
                if entry.get('currency_code') != 'EUR':
                    raise ValueError(f"Development sample {entry.get('product_name')} must use EUR")
                days_ago = entry.pop('days_ago')
                warranty_days = entry.pop('warranty_days', None)
                return_days = entry.pop('return_days', None)
                lifetime = entry.pop('lifetime', False)
                component = entry.pop('component', None)
                purchase = Purchase(**entry, purchase_date=today - timedelta(days=days_ago),
                                    retailer_id=retailer.id, brand_id=brand.id,
                                    notes='Fictional development sample. Safe to edit or delete.',
                                    return_deadline=today + timedelta(days=return_days) if return_days is not None else None)
                session.add(purchase)
                await session.flush()
                if warranty_days is not None or lifetime:
                    session.add(Warranty(purchase_id=purchase.id, warranty_start=purchase.purchase_date,
                        warranty_end=date(9999, 12, 31) if lifetime else today + timedelta(days=warranty_days),
                        warranty_type='LIFETIME' if lifetime else 'LIMITED',
                        status='ACTIVE' if lifetime or warranty_days >= 0 else 'EXPIRED'))
                if component:
                    session.add(Component(purchase_id=purchase.id, name=component, price=Decimal('79.00'),
                                          currency_code=purchase.currency_code, tags='sample'))
                content = f'SAMPLE RECEIPT — NOT A REAL PURCHASE\n{purchase.product_name}\n{purchase.currency_code} {purchase.price}\n'.encode()
                digest = hashlib.sha256(content).hexdigest()
                stored = f'{digest}.txt'
                path = DATA / 'uploads' / digest[:2] / digest[2:4] / stored
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(content)
                session.add(File(purchase_id=purchase.id, filename='sample-receipt.txt', stored_filename=stored,
                                 file_type=FileType.RECEIPT, mime_type='text/plain', file_size=len(content),
                                 file_hash=digest, reference_count=1))
            session.add_all([Setting(key='currency_code', value='EUR'), Setting(key='date_format', value='DD/MM/YYYY')])
        await session.commit()
        print('Created fictional purchases, warranties, a component, and sample receipts in .dev/.')
    await async_engine.dispose()


if __name__ == '__main__':
    asyncio.run(seed())
