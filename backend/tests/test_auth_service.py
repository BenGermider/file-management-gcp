import pytest
from api.services.auth import AuthService
from models.user import User
import uuid


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email="test@example.com",
        name="Test User",
        role="user"
    )


@pytest.mark.asyncio
async def test_create_app_token(mock_user):
    token = await AuthService.create_app_token(mock_user)
    assert isinstance(token, str)
    assert len(token) > 0


@pytest.mark.asyncio
async def test_get_or_create_user_existing(mock_db, mock_user):
    mock_db.execute.return_value.scalar_one_or_none.return_value = mock_user

    result = await AuthService.get_or_create_user(
        mock_db, "test@example.com", "Test User"
    )

    assert result.email == "test@example.com"
    mock_db.add.assert_not_called()


@pytest.mark.asyncio
async def test_get_or_create_user_new(mock_db):
    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    result = await AuthService.get_or_create_user(
        mock_db, "new@test.com", "New User"
    )

    assert result.email == "new@test.com"
    mock_db.add.assert_called_once()
    mock_db.commit.assert_awaited_once()
