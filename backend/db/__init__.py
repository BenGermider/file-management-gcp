import asyncio
from db.database import engine, Base

async def init_models():

    from models.user import User

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose():
    await engine.dispose()