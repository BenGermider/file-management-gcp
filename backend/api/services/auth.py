from urllib.parse import urlencode
import secrets
import jwt
import httpx
from datetime import datetime, timedelta
from google.oauth2 import id_token
from google.auth.transport import requests
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.consts import OAUTH2_URL, GOOGLE_API_TOKEN, GOOGLE_SCOPE
from core.settings import settings
from models.user import User

# Auth service
class AuthService:
    GOOGLE_ID = settings.GOOGLE_CLIENT_ID
    SECRET = settings.GOOGLE_CLIENT_SECRET
    URI = (
        f"http://{settings.BACKEND_HOST}:{settings.BACKEND_PORT}/"
        f"api/auth/google/callback"
    )
    JWT_SECRET = secrets.token_urlsafe(32)
    JWT_ALGORITHM = settings.JWT_ALGORITHM
    JWT_EXPIRY_HOURS = 24

    @classmethod
    async def _is_admin(cls, user):
        return "admin" if user in settings.ADMIN else "user"

    @classmethod
    async def get_google_login_url(cls):
        params = {
            "client_id": AuthService.GOOGLE_ID,
            "redirect_uri": AuthService.URI,
            "response_type": "code",
            "scope": GOOGLE_SCOPE,
            "access_type": "offline",
            "prompt": "select_account",
        }
        return f"{OAUTH2_URL}?{urlencode(params)}"

    @classmethod
    async def _exchange_google_code(cls, code: str) -> dict:
        """Exchange Google auth code for tokens"""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_API_TOKEN,
                data={
                    "code": code,
                    "client_id": cls.GOOGLE_ID,
                    "client_secret": cls.SECRET,
                    "redirect_uri": cls.URI,
                    "grant_type": "authorization_code",
                },
            )
            return resp.json()

    @classmethod
    def _decode_google_token(cls, g_token: str) -> dict:
        payload = id_token.verify_oauth2_token(
            g_token,
            requests.Request(),
            cls.GOOGLE_ID,
            clock_skew_in_seconds=10
        )
        return payload

    @classmethod
    async def create_app_token(cls, email: str) -> str:
        """Create JWT token for your app"""
        payload = {
            "sub": email,
            "exp": datetime.utcnow() + timedelta(hours=cls.JWT_EXPIRY_HOURS),
            "iat": datetime.utcnow(),
            "role": await cls._is_admin(email)
        }
        return jwt.encode(payload, cls.JWT_SECRET, algorithm=cls.JWT_ALGORITHM)

    @classmethod
    async def get_or_create_user(cls, db: AsyncSession, email: str, name: str) -> User:
        """Get existing user or create new one"""
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            role = await cls._is_admin(email)
            user = User(email=email, name=name, role=role)
            db.add(user)
            await db.commit()
            await db.refresh(user)

        return user

    @classmethod
    async def handle_google_callback(cls, code: str, db: AsyncSession) -> dict:
        """Complete Google OAuth flow and return app token"""
        # Exchange code for Google tokens
        token_data = await cls._exchange_google_code(code)
        g_token = token_data.get("id_token")

        if not g_token:
            raise Exception("Failed to obtain ID token from Google")

        # Decode token to get user info
        payload = cls._decode_google_token(g_token)
        email = payload.get("email")
        name = payload.get("name")

        # Save or get user from DB
        user = await cls.get_or_create_user(db, email, name)

        # Create app JWT
        app_token = await cls.create_app_token(email)

        return {
            "token": app_token,
            "email": email,
            "name": name,
        }