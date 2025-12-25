from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


@router.get("/me")
async def get_user():
    ...