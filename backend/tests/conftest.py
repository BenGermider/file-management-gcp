"""
Shared test fixtures for pytest
Save this file as: tests/conftest.py
"""
import pytest
from unittest.mock import AsyncMock, Mock


@pytest.fixture
def mock_db():

    db = Mock()

    context_manager = Mock()
    context_manager.__aenter__ = AsyncMock(return_value=db)
    context_manager.__aexit__ = AsyncMock(return_value=None)
    db.begin.return_value = context_manager

    db.execute = AsyncMock()

    result_mock = Mock()
    result_mock.scalar_one_or_none = Mock(return_value=None)  # Regular Mock, not AsyncMock
    result_mock.scalars = Mock()
    result_mock.scalars.return_value.all = Mock(return_value=[])

    db.execute.return_value = result_mock

    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.delete = AsyncMock()

    db.add = Mock()
    db.refresh = AsyncMock()

    return db
