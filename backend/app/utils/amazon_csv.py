import csv
import asyncio
import hashlib
import os
import re
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
import httpx
import aiofiles

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import select as sa_select

from app.models.purchase import Purchase
from app.models.retailer import Retailer
from app.models.file import File as FileModel, FileType
from app.config import settings


COLUMN_MAPPINGS = {
    "product_name": ["Title", "Product Name", "Item Description"],
    "order_date": ["Order Date", "Ship Date"],
    "order_id": ["Order ID"],
    "price": [
        "Shipment Item Subtotal",
        "Item Total",
        "Total Amount",
        "Total Owed",
        "Item Subtotal",
        "Purchase Price Per Unit",
    ],
    "currency": ["Currency"],
    "asin": ["ASIN", "ASIN/ISBN", "ISBN"],
    "quantity": ["Original Quantity", "Quantity"],
    "category": ["Category", "Item Category", "Website"],
}

UPLOAD_DIR = settings.uploads_dir


def _resolve_columns(headers: list[str]) -> dict[str, Optional[str]]:
    result = {}
    for internal_name, possible_names in COLUMN_MAPPINGS.items():
        found = None
        for possible_name in possible_names:
            if possible_name in headers:
                found = possible_name
                break
        result[internal_name] = found
    return result


def _parse_price(raw: str) -> tuple[Decimal, str]:
    if not raw or not raw.strip():
        return Decimal("0"), "USD"

    raw = raw.strip()

    currency_map = {
        "$": "USD",
        "USD": "USD",
        "EUR": "EUR",
        "GBP": "GBP",
        "CAD": "CAD",
        "AUD": "AUD",
        "JPY": "JPY",
        "INR": "INR",
    }

    currency_code = "USD"

    for symbol, code in currency_map.items():
        if raw.startswith(symbol):
            currency_code = code
            raw = raw[len(symbol) :]
            break

    raw = raw.strip()

    raw = re.sub(r"[^\d.,\-]", "", raw)

    if raw.count(",") > 1:
        raw = raw.replace(",", "")
    elif "," in raw and "." in raw:
        if raw.rindex(",") > raw.rindex("."):
            raw = raw.replace(",", ".")
        else:
            raw = raw.replace(",", "")
    elif "," in raw:
        if len(raw.split(",")[1]) == 2:
            raw = raw.replace(",", ".")
        else:
            raw = raw.replace(",", "")

    try:
        return Decimal(raw), currency_code
    except Exception:
        return Decimal("0"), currency_code


def _parse_date(raw: str) -> Optional[date]:
    if not raw or not raw.strip():
        return None

    raw = raw.strip()

    if "T" in raw or "Z" in raw:
        try:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return dt.date()
        except ValueError:
            pass

    date_formats = [
        "%m/%d/%Y",
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%m-%d-%Y",
        "%Y/%m/%d",
        "%d-%m-%Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d %B %Y",
        "%d %b %Y",
    ]

    for fmt in date_formats:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue

    return None


async def _get_or_create_amazon_retailer(db: AsyncSession) -> Retailer:
    result = await db.execute(sa_select(Retailer).filter(Retailer.name == "Amazon"))
    retailer = result.scalar_one_or_none()

    if not retailer:
        retailer = Retailer(name="Amazon", url="https://www.amazon.com")
        db.add(retailer)
        await db.flush()
        await db.refresh(retailer)

    return retailer


async def fetch_and_store_amazon_image(
    db: AsyncSession, purchase_id: str, asin: str, uploads_dir: str
) -> bool:
    url = f"https://m.media-amazon.com/images/P/{asin}.jpg"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)

            if response.status_code not in (200, 201):
                return False

            content_type = response.headers.get("content-type", "")
            if not content_type.startswith("image/"):
                return False

            image_bytes = response.content

            if len(image_bytes) < 100:
                return False

            file_hash = hashlib.sha256(image_bytes).hexdigest()

            result = await db.execute(
                sa_select(FileModel).filter(
                    FileModel.file_hash == file_hash,
                    FileModel.purchase_id == purchase_id,
                )
            )
            existing_in_purchase = result.scalar_one_or_none()
            if existing_in_purchase:
                return True

            result = await db.execute(
                sa_select(FileModel).filter(FileModel.file_hash == file_hash)
            )
            existing_file = result.scalars().first()

            if existing_file:
                existing_file.reference_count += 1

                stored_filename = existing_file.stored_filename

                db_file = FileModel(
                    purchase_id=purchase_id,
                    filename=f"{asin}.jpg",
                    stored_filename=stored_filename,
                    file_type=FileType.PHOTO,
                    mime_type="image/jpeg",
                    file_size=len(image_bytes),
                    file_hash=file_hash,
                    reference_count=0,
                )
                db.add(db_file)
                await db.commit()
                return True

            subdir1 = file_hash[:2]
            subdir2 = file_hash[2:4]
            full_dir = os.path.join(uploads_dir, subdir1, subdir2)
            os.makedirs(full_dir, exist_ok=True)

            stored_filename = f"{file_hash}.jpg"
            file_path = os.path.join(full_dir, stored_filename)

            async with aiofiles.open(file_path, "wb") as f:
                await f.write(image_bytes)

            db_file = FileModel(
                purchase_id=purchase_id,
                filename=f"{asin}.jpg",
                stored_filename=stored_filename,
                file_type=FileType.PHOTO,
                mime_type="image/jpeg",
                file_size=len(image_bytes),
                file_hash=file_hash,
            )

            db.add(db_file)
            await db.commit()

            return True

    except Exception:
        return False


async def fetch_amazon_images_batch(
    db: AsyncSession, pairs: list[tuple[str, str]], uploads_dir: str
) -> tuple[int, int]:
    success_count = 0
    fail_count = 0

    for purchase_id, asin in pairs:
        if not asin or not asin.strip():
            continue

        success = await fetch_and_store_amazon_image(
            db, purchase_id, asin.strip(), uploads_dir
        )

        if success:
            success_count += 1
        else:
            fail_count += 1

        await asyncio.sleep(0.5)

    return success_count, fail_count


async def import_amazon_csv(
    db: AsyncSession, csv_content: str, fetch_images: bool = True
) -> dict:
    result = {
        "purchases_added": 0,
        "purchases_skipped": 0,
        "images_fetched": 0,
        "images_failed": 0,
        "errors": [],
    }

    lines = csv_content.splitlines()
    if len(lines) < 2:
        result["errors"].append("CSV file is empty or has no data rows")
        return result

    reader = csv.DictReader(lines)
    headers = reader.fieldnames or []

    column_map = _resolve_columns(headers)

    if (
        not column_map["product_name"]
        or not column_map["price"]
        or not column_map["order_date"]
    ):
        result["errors"].append(
            "CSV is missing required columns (Title, Item Total, Order Date)"
        )
        return result

    retailer = await _get_or_create_amazon_retailer(db)

    today = datetime.now().date()

    purchases_to_add = []
    image_pairs = []

    for row_num, row in enumerate(reader, start=2):
        product_name = row.get(column_map["product_name"], "").strip()
        if not product_name:
            result["purchases_skipped"] += 1
            continue

        price_raw = row.get(column_map["price"], "0")
        price, currency_code = _parse_price(price_raw)

        date_raw = row.get(column_map["order_date"], "")
        purchase_date = _parse_date(date_raw)

        if not purchase_date:
            result["purchases_skipped"] += 1
            continue

        if purchase_date > today:
            result["purchases_skipped"] += 1
            continue

        order_id = row.get(column_map["order_id"], "").strip()
        asin = row.get(column_map["asin"], "").strip()

        quantity_raw = row.get(column_map["quantity"], "1")
        try:
            quantity = int(quantity_raw) if quantity_raw else 1
        except ValueError:
            quantity = 1

        category = row.get(column_map["category"], "").strip()

        link = None
        if asin:
            link = f"https://amazon.com/dp/{asin}"

        existing_result = await db.execute(
            sa_select(Purchase).filter(
                Purchase.retailer_order_number == order_id,
                Purchase.product_name == product_name,
                Purchase.retailer_id == retailer.id,
            )
        )
        existing_purchase = existing_result.scalar_one_or_none()

        if existing_purchase:
            result["purchases_skipped"] += 1
            continue

        db_purchase = Purchase(
            product_name=product_name,
            price=price,
            currency_code=currency_code,
            retailer_id=retailer.id,
            purchase_date=purchase_date,
            retailer_order_number=order_id,
            quantity=quantity,
            link=link,
            tags=category if category else None,
        )
        db.add(db_purchase)
        purchases_to_add.append(db_purchase)

        if asin:
            image_pairs.append((db_purchase.id, asin))

    await db.commit()

    for purchase in purchases_to_add:
        result["purchases_added"] += 1
        await db.refresh(purchase)

    if fetch_images and image_pairs:
        images_success, images_fail = await fetch_amazon_images_batch(
            db, image_pairs, UPLOAD_DIR
        )
        result["images_fetched"] = images_success
        result["images_failed"] = images_fail

    return result
