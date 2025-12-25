from fastapi import APIRouter

router = APIRouter()


@router.get(
    "/files",
    # response_model=List[FileOut]
)
async def list_all_files():
    ...

@router.get("/metrics")
async def get_metrics():
    ...
