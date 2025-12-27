from db.database import Base, init_db_engine
from db.database import engine


async def init_models():
    # Initialize engine first
    init_db_engine()

    # Import engine again after initialization

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose():
    if engine:
        await engine.dispose()
