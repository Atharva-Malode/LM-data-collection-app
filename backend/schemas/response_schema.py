from pydantic import BaseModel
from typing import Generic, TypeVar, Optional

T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    """Standardized API response wrapper."""
    success: bool
    message: str
    data: Optional[T] = None
