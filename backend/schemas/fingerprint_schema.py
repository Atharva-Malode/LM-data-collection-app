from pydantic import BaseModel, Field
from typing import Optional, Union

class Point(BaseModel):
    """X and Y coordinates on the image canvas (scaled to 100)."""
    x: float
    y: float

class FingerprintFrontend(BaseModel):
    """Representing fingerprint data sent by the React frontend."""
    image: Optional[str] = None  # Base64 data URL
    pattern: str = ""
    subPattern: str = ""
    core: Optional[Point] = None
    delta: Optional[Point] = None
    ridgeManual1: str = ""
    ridgeManual2: str = ""
    ridgeAuto: str = ""
    saved: bool = False

class FingerprintDatabase(BaseModel):
    """Representing fingerprint details stored in the patient.json file."""
    image_filename: Union[str, None] = "NA"
    image_path: Union[str, None] = "NA"
    annotated_image_path: Union[str, None] = "NA"
    pattern: Union[str, None] = "NA"
    sub_pattern: Union[str, None] = "NA"
    confidence: Union[float, str, None] = "NA"
    core_x: Union[int, str, None] = "NA"
    core_y: Union[int, str, None] = "NA"
    delta_x: Union[int, str, None] = "NA"
    delta_y: Union[int, str, None] = "NA"
    ridge_count: Union[int, str, None] = "NA"
