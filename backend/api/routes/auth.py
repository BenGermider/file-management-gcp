import httpx

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode
from google.oauth2 import id_token
from google.auth.transport import requests

from core.consts import GOOGLE_REDIRECT_URI, OAUTH2_URL, GOOGLE_API_TOKEN, GOOGLE_SCOPE
from core.settings import settings

router = APIRouter(tags=["auth"])


GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI = GOOGLE_REDIRECT_URI.format(backend=settings.BACKEND_HOST, port=settings.BACKEND_PORT)


@router.get("/google")
async def google_login():
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GOOGLE_SCOPE,
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = OAUTH2_URL.format(params=params)
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
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        token_data = resp.json()

    g_token = token_data.get("id_token")
    access_token = token_data.get("access_token")

    if not id_token:
        raise HTTPException(status_code=400, detail="Failed to obtain ID token from Google")

    # Decode ID token to get user info
    payload = id_token.verify_oauth2_token(
        g_token,
        requests.Request(),
        GOOGLE_CLIENT_ID,
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
