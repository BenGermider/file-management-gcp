from db.database import engine, Base, init_db_engine


async def init_models():
    # Initialize engine first
    init_db_engine()

    # Import engine again after initialization
    from db.database import engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose():
    from db.database import engine
    if engine:
        await engine.dispose()