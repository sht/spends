import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database import Base, get_db


# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool  # Use StaticPool for in-memory database
    )
    yield engine
    await engine.dispose()


@pytest.fixture(scope="session")
async def test_session_local(test_engine):
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    yield async_session


@pytest.fixture
async def test_client(test_session_local):
    async def override_get_db():
        async with test_session_local() as session:
            yield session

    # Override the get_db dependency
    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    # Clean up the override after the test
    app.dependency_overrides.clear()


@pytest.fixture
async def db_session(test_session_local):
    async with test_session_local() as session:
        yield session