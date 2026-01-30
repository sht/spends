from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Create sync engine for Alembic compatibility
if settings.database_url.startswith("sqlite"):
    # Use sync SQLite for Alembic compatibility
    sync_engine = create_engine(
        settings.database_url.replace("+aiosqlite", ""),
        echo=True,
        connect_args={"check_same_thread": False}  # Required for SQLite
    )
else:
    # For PostgreSQL, use the async engine
    sync_engine = create_engine(settings.database_url.replace("asyncpg", "psycopg2"))

# Create async engine for application use
async_engine = create_async_engine(
    settings.database_url,
    echo=True,  # Set to True to see SQL queries in the logs
    pool_pre_ping=True,  # Verify connections before using them
)

# Create async session maker
AsyncSessionLocal = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Create base class for models
Base = declarative_base()


# Dependency to get DB session
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session