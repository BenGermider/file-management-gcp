
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_NAME: str = "file_management"

    INSTANCE_CONNECTION_NAME: str = ""

    DB_HOST: str = "localhost"
    DB_PORT: str = "5432"

    FRONTEND_URL: str = "localhost:3000"

    ADMIN: list = []

    USE_GCS: str = "false"
    GCS_BUCKET_NAME: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    GCP_PROJECT_ID: str = ""

    BASE_URL: str = "http://localhost:8000"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/oauth/callback"

    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION: int = 24

    ELASTICSEARCH_URL: str = "http://elasticsearch:9200"

    @property
    def DATABASE_URL(self) -> str:
        """Generate database URL based on environment"""
        if self.INSTANCE_CONNECTION_NAME:
            # Production: Cloud SQL via Unix socket
            return (
                f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
                f"@/{self.DB_NAME}?host=/cloudsql/{self.INSTANCE_CONNECTION_NAME}"
            )
        else:
            # Development: Local PostgreSQL
            return (
                f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
                f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            )

    class Config:
        env_file = ".env"


settings = Settings()
