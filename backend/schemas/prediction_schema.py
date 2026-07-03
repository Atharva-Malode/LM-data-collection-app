from pydantic import BaseModel
from typing import Optional

class PredictionRequest(BaseModel):
    """Payload for submitting a fingerprint image as base64."""
    image: str  # Base64 string, can be a raw base64 or Data URL

class PatternResponse(BaseModel):
    """Response payload for pattern prediction."""
    pattern: str
    confidence: float

class CoreDeltaResponse(BaseModel):
    """Response payload for core/delta coordinates detection."""
    core_x: Optional[int] = None
    core_y: Optional[int] = None
    delta_x: Optional[int] = None
    delta_y: Optional[int] = None

class RidgeCountResponse(BaseModel):
    """Response payload for ridge counting prediction."""
    ridge_count: int
