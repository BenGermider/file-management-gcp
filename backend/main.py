import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from api.routes.auth import router as auth_router
from api.routes.files import router as files_router


from db import init_models, dispose

@asynccontextmanager
async def lifespan(app: FastAPI):

    await init_models()

    yield

    await dispose()

app = FastAPI(
    title="File Management API",
    description=(
        "Cortex home assignment. File management API where users can upload files. "
        "The API runs on GCP and uses Firebase, Cloud Storage, and Elasticsearch."
    ),
    version="1.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router, prefix="/api/auth")
app.include_router(files_router, prefix="/api/files")

@app.get("/health")
def hello():
    return {"message": "Hello from backend"}


