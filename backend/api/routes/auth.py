from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode
import httpx
import os
from jose import jwt

router = APIRouter(tags=["auth"])

# Load credentials from environment variables
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")          # Must be "Web Application" client ID
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")  # Must be client secret from Google
GOOGLE_REDIRECT_URI = "http://localhost:8000/api/auth/google/callback"  # Must match Google console
GOOGLE_SCOPE = "openid email profile"

# -------------------------------
# Step 1: Redirect user to Google
# -------------------------------
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
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url)

# -------------------------------
# Step 2: Handle Google callback
# -------------------------------
@router.get("/google/callback")
async def google_callback(request: Request):
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Code not provided")

    # Exchange authorization code for tokens
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        token_data = resp.json()

    id_token = token_data.get("id_token")
    access_token = token_data.get("access_token")

    if not id_token:
        raise HTTPException(status_code=400, detail="Failed to obtain ID token from Google")

    # Decode ID token to get user info
    payload = jwt.decode(
        id_token,
        GOOGLE_CLIENT_ID,        # Verify audience
        algorithms=["RS256"],
        options={"verify_aud": True},
    )
    email = payload.get("email")
    name = payload.get("name")

    # TODO: create your own app JWT / session here
    # For example, store user in DB, generate app JWT, etc.

    return {
        "email": email,
        "name": name,
        "id_token": id_token,
        "access_token": access_token,
        "message": "Login successful"
    }
