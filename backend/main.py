from fastapi import FastAPI

app = FastAPI(
    title="File Management API",
    description=(
        "Cortex home assignment. File management API where users can upload files. "
        "The API runs on GCP and uses Firebase, Cloud Storage, and Elasticsearch."
    ),
    version="1.0.0",
    # lifespan=lifespan
)

@app.get("/health")
def hello():
    return {"message": "Hello from backend"}


