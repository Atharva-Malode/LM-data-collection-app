import os
import sys
import cv2
import numpy as np

# Setup import paths dynamically to prevent hyphen-related import issues
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AIML_DIR = os.path.join(BASE_DIR, "AI-ML")

if AIML_DIR not in sys.path:
    sys.path.append(AIML_DIR)

# AI-ML preprocessing and detection disabled to remove PyTorch model dependencies
HAS_DETECTOR = False

def detect_core_delta(cv_img: np.ndarray) -> tuple[tuple[int, int] | None, tuple[int, int] | None]:
    """
    Detects core and delta singular points on the fingerprint image.
    Returns (core_point, delta_point) where each point is (x, y) in pixels or None.
    """
    if not HAS_DETECTOR:
        return None, None
    # Ensure image is single-channel grayscale
    if len(cv_img.shape) == 3:
        if cv_img.shape[2] == 4:
            gray = cv2.cvtColor(cv_img, cv2.COLOR_BGRA2GRAY)
        else:
            gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    else:
        gray = cv_img.copy()

    # Preprocessing pipeline
    enhanced, binary = preprocess_fingerprint(gray)
    mask = build_mask(enhanced)
    quality_mask = build_quality_mask(enhanced)
    orientation = compute_orientation(enhanced)
    
    # Run core/delta detection
    # detect_singular_points draws orientation on debug_img if provided. We pass None.
    core_point, delta_point = detect_singular_points(
        orientation, mask,
        quality_mask=quality_mask,
        debug_img=None
    )
    
    # Convert points to standard python int tuples
    final_core = (int(core_point[0]), int(core_point[1])) if core_point is not None else None
    final_delta = (int(delta_point[0]), int(delta_point[1])) if delta_point is not None else None
    
    return final_core, final_delta
