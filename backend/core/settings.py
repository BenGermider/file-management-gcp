from pydantic_settings import BaseSettings

class Settings(BaseSettings):

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    BACKEND_HOST: str = "localhost"
    BACKEND_PORT: int = 8000


settings = Settings()