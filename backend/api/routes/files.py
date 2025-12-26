from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Response, UploadFile
from fastapi.responses import StreamingResponse
from starlette.status import (
    HTTP_204_NO_CONTENT,
    HTTP_201_CREATED,
    HTTP_404_NOT_FOUND,
    HTTP_403_FORBIDDEN,
    HTTP_400_BAD_REQUEST
)

router = APIRouter(tags=["files"])


@router.post(
    "/upload",
)
async def upload_files(

):
    ...

@router.get(
    ""
)
async def list_files():
    ...

@router.get("/{file_id}")
async def get_file():
    ...

@router.get("/{file_id}/download")
async def download_file():
    ...

@router.delete(
    "/{file_id}",
    status_code=HTTP_204_NO_CONTENT
)
async def delete_file(

):
    ...