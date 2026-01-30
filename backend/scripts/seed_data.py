import asyncio
import sys
import os
# Add the parent directory to the path so we can import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import Base
from app.models.retailer import Retailer
from app.models.brand import Brand


async def seed_default_data():
    # Create async engine
    engine = create_async_engine(settings.database_url)

    async with engine.begin() as conn:
        # Create tables (if they don't exist)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as session:
        # Check if retailers already exist
        result = await session.execute(select(Retailer))
        existing_retailers = result.scalars().all()
        if not existing_retailers:
            # Add default retailers
            default_retailers = [
                Retailer(name="Amazon", url="https://amazon.com"),
                Retailer(name="Best Buy", url="https://bestbuy.com"),
                Retailer(name="Walmart", url="https://walmart.com"),
                Retailer(name="Target", url="https://target.com"),
                Retailer(name="Apple Store", url="https://apple.com"),
                Retailer(name="Microsoft Store", url="https://microsoft.com"),
                Retailer(name="Costco", url="https://costco.com"),
                Retailer(name="Home Depot", url="https://homedepot.com"),
            ]

            for retailer in default_retailers:
                session.add(retailer)

            await session.commit()
            print(f"Added {len(default_retailers)} default retailers")
        else:
            print("Retailers already exist, skipping seeding")

        # Check if brands already exist
        result = await session.execute(select(Brand))
        existing_brands = result.scalars().all()
        if not existing_brands:
            # Add default brands
            default_brands = [
                Brand(name="Apple", url="https://apple.com"),
                Brand(name="Samsung", url="https://samsung.com"),
                Brand(name="Sony", url="https://sony.com"),
                Brand(name="Microsoft", url="https://microsoft.com"),
                Brand(name="Google", url="https://google.com"),
                Brand(name="LG", url="https://lg.com"),
                Brand(name="Dell", url="https://dell.com"),
                Brand(name="HP", url="https://hp.com"),
                Brand(name="Nike", url="https://nike.com"),
                Brand(name="Adidas", url="https://adidas.com"),
            ]

            for brand in default_brands:
                session.add(brand)

            await session.commit()
            print(f"Added {len(default_brands)} default brands")
        else:
            print("Brands already exist, skipping seeding")


if __name__ == "__main__":
    asyncio.run(seed_default_data())