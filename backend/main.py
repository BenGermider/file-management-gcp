from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from prometheus_fastapi_instrumentator import Instrumentator
from api.routes.auth import router as auth_router
from api.routes.files import router as files_router
from api.routes.admin import router as admin_router
from api.services.files import file_service

from db import init_models, dispose


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Try to initialize database with error handling
    try:
        await init_models()
        print("✓ Database initialized successfully")
    except Exception as e:
        print(f"⚠ Warning: Database initialization failed: {e}")
        print("App will start anyway, but database operations may fail")

    # Try to initialize file service
    try:
        await file_service.init()
        print("✓ File service initialized successfully")
    except Exception as e:
        print(f"⚠ Warning: File service initialization failed: {e}")

    yield

    # Cleanup
    try:
        await file_service.close()
    except Exception as e:
        print(f"Warning: Error closing file service: {e}")

    try:
        await dispose()
    except Exception as e:
        print(f"Warning: Error disposing database: {e}")


app = FastAPI(
    title="File Management API",
    description=(
        "Cortex home assignment. File management API where users can upload files. "
        "The API runs on GCP and uses Firebase, Cloud Storage, and Elasticsearch."
    ),
    version="1.0.0",
    lifespan=lifespan
)

Instrumentator().instrument(app).expose(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth")
app.include_router(files_router, prefix="/api/files")
app.include_router(admin_router, prefix="/api/admin")


@app.get("/health")
def hello():
    return {"message": "Hello from backend"}


EOF