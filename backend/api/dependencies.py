from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from starlette.requests import Request
import jwt
from core.settings import settings

security = HTTPBearer()

async def get_current_user(request: Request) -> dict:
    """Extract user info from JWT token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"]
        )
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")