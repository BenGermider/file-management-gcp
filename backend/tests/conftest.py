"""
Shared test fixtures for pytest
Save this file as: tests/conftest.py
"""
import pytest
from unittest.mock import AsyncMock, Mock


@pytest.fixture
def mock_db():
    """
    Create mock database session for testing
    FIXED: scalar_one_or_none needs to be a callable that returns a value
    """
    db = Mock()

    # Context manager for db.begin()
    context_manager = Mock()
    context_manager.__aenter__ = AsyncMock(return_value=db)
    context_manager.__aexit__ = AsyncMock(return_value=None)
    db.begin.return_value = context_manager

    # Make execute async
    db.execute = AsyncMock()

    # CRITICAL FIX: scalar_one_or_none is a METHOD that needs to be called
    # We need it to return a Mock that has scalar_one_or_none as a regular method
    result_mock = Mock()
    result_mock.scalar_one_or_none = Mock(return_value=None)  # Regular Mock, not AsyncMock
    result_mock.scalars = Mock()
    result_mock.scalars.return_value.all = Mock(return_value=[])

    db.execute.return_value = result_mock

    # Async operations
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.delete = AsyncMock()

    # Regular operations
    db.add = Mock()
    db.refresh = AsyncMock()

    return db
