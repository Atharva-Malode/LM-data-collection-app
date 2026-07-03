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

def get_line_pixels(p1: tuple[int, int], p2: tuple[int, int]) -> list[tuple[int, int]]:
    """Generates all pixel coordinates along a line from p1 to p2 using Bresenham's algorithm."""
    x1, y1 = p1
    x2, y2 = p2
    points = []
    dx = abs(x2 - x1)
    dy = abs(y2 - y1)
    x, y = x1, y1
    sx = 1 if x1 < x2 else -1
    sy = 1 if y1 < y2 else -1
    
    if dx > dy:
        err = dx / 2.0
        while x != x2:
            points.append((x, y))
            err -= dy
            if err < 0:
                y += sy
                err += dx
            x += sx
    else:
        err = dy / 2.0
        while y != y2:
            points.append((x, y))
            err -= dx
            if err < 0:
                x += sx
                err += dy
            y += sy
            
    points.append((x2, y2))
    return points

def count_ridges(cv_img: np.ndarray, core_pct: tuple[float, float] = None, delta_pct: tuple[float, float] = None) -> int:
    """
    Counts the number of ridges crossed between Core and Delta.
    Supports custom core and delta percentage coordinates, or auto-detection.
    """
    # Ensure grayscale
    if len(cv_img.shape) == 3:
        if cv_img.shape[2] == 4:
            gray = cv2.cvtColor(cv_img, cv2.COLOR_BGRA2GRAY)
        else:
            gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    else:
        gray = cv_img.copy()

    h, w = gray.shape

    # Preprocessing & Skeletonization
    if HAS_DETECTOR:
        enhanced, binary = preprocess_fingerprint(gray)
        skeleton = thin_fingerprint(binary)
    else:
        # Fallback using OpenCV if AI models are missing
        filtered = cv2.bilateralFilter(gray, 9, 75, 75)
        binary = cv2.adaptiveThreshold(filtered, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        skeleton = cv2.ximgproc.thinning(binary)

    # Determine core/delta coordinates in pixels
    p1 = None
    p2 = None

    # Try custom coordinates first
    if core_pct is not None and delta_pct is not None:
        p1 = (int(round(core_pct[0] / 100.0 * w)), int(round(core_pct[1] / 100.0 * h)))
        p2 = (int(round(delta_pct[0] / 100.0 * w)), int(round(delta_pct[1] / 100.0 * h)))
        print(f"[RIDGE COUNT] Using coordinates: Core={p1}, Delta={p2}")
    elif HAS_DETECTOR:
        # Auto-detect if custom points are not provided and detector is available
        mask = build_mask(enhanced)
        quality_mask = build_quality_mask(enhanced)
        orientation = compute_orientation(enhanced)
        
        core_point, delta_point = detect_singular_points(
            orientation, mask,
            quality_mask=quality_mask,
            debug_img=None
        )
        if core_point is not None and delta_point is not None:
            p1 = (int(core_point[0]), int(core_point[1]))
            p2 = (int(delta_point[0]), int(delta_point[1]))
            print(f"[RIDGE COUNT] Auto-detected: Core={p1}, Delta={p2}")

    # If we don't have both coordinates, raise ValueError
    if p1 is None or p2 is None:
        raise ValueError("Core or Delta point could not be detected. Cannot calculate ridge count.")

    # Get all pixel coordinates along the line
    line_pts = get_line_pixels(p1, p2)
    
    # Sample skeleton image along the line and count 0 -> 255 transitions
    crossings = 0
    in_ridge = False
    
    for x, y in line_pts:
        # Prevent out of bounds
        if 0 <= x < w and 0 <= y < h:
            val = skeleton[y, x]
            if val > 127:  # White ridge pixel in thinned skeleton
                if not in_ridge:
                    crossings += 1
                    in_ridge = True
            else:
                in_ridge = False
                
    return max(1, crossings)
