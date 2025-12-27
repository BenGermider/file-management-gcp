from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from core.settings import settings

Base = declarative_base()

# Create the URL immediately using your settings
DATABASE_URL = (
    f"postgresql+asyncpg://{settings.DB_USER}:{settings.DB_PASSWORD}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/"
    f"file-manager-db"
)

# Initialize engine immediately so it's never None
engine = create_async_engine(DATABASE_URL, echo=True)

async_session = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession
)

async def get_db():
    async with async_session() as session:
        yield session