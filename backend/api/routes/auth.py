import httpx

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode
from google.oauth2 import id_token
from google.auth.transport import requests

from core.consts import OAUTH2_URL, GOOGLE_API_TOKEN, GOOGLE_SCOPE
from core.settings import settings

router = APIRouter(tags=["auth"])


GOOGLE_ID = settings.GOOGLE_CLIENT_ID
SECRET = settings.GOOGLE_CLIENT_SECRET
URI = (
        f"http://{settings.BACKEND_HOST}:{settings.BACKEND_PORT}/"
        f"api/auth/google/callback"
)



@router.get("/google")
async def google_login():
    params = {
        "client_id": GOOGLE_ID,
        "redirect_uri": URI,
        "response_type": "code",
        "scope": GOOGLE_SCOPE,
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = f"{OAUTH2_URL}?{urlencode(params)}"
    return RedirectResponse(url)



@router.get("/google/callback")
async def google_callback(request: Request):
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Code not provided")

    # Exchange authorization code for tokens
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_API_TOKEN,
            data={
                "code": code,
                "client_id": GOOGLE_ID,
                "client_secret": SECRET,
                "redirect_uri": URI,
                "grant_type": "authorization_code",
            },
        )
        token_data = resp.json()

    g_token = token_data.get("id_token")
    access_token = token_data.get("access_token")

    if not g_token:
        raise HTTPException(status_code=400, detail="Failed to obtain ID token from Google")

    # Decode ID token to get user info
    payload = id_token.verify_oauth2_token(
        g_token,
        requests.Request(),
        GOOGLE_ID,
        clock_skew_in_seconds=10
    )
    email = payload.get("email")
    name = payload.get("name")

    # TODO: create your own app JWT / session here
    # For example, store user in DB, generate app JWT, etc.

    return {
        "email": email,
        "name": name,
        "id_token": g_token,
        "access_token": access_token,
        "message": "Login successful"
    }
