from fastapi import APIRouter

router = APIRouter()


@router.get(
    "/files",
)
async def list_all_files():
    ...

@router.get("/metrics")
async def get_metrics():
    ...
