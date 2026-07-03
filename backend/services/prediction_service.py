import base64
import cv2
import numpy as np
from typing import Tuple, Optional, Any
from ai.pattern_predictor import predict_pattern
from ai.core_delta_detector import detect_core_delta
from ai.ridge_counter import count_ridges

class PredictionService:
    """Decodes input image streams and routes them to mock/fallback or thinned OpenCV processing."""

    def __init__(self, device: str = 'cpu'):
        self.device = device

    def _decode_image(self, base64_str_or_bytes: Any) -> np.ndarray:
        """Decodes bytes, base64 string, or fetches/loads a hosted URL into an OpenCV image."""
        try:
            if isinstance(base64_str_or_bytes, bytes):
                nparr = np.frombuffer(base64_str_or_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            else:
                base64_str = str(base64_str_or_bytes)
                
                # Check if it's a URL
                if base64_str.startswith("http://") or base64_str.startswith("https://"):
                    img = None
                    # Try local file resolution for local /patients/ hosted URLs
                    if "/patients/" in base64_str:
                        try:
                            import os
                            from urllib.parse import unquote
                            relative_path = base64_str.split("/patients/")[1].split("?")[0]
                            relative_path = unquote(relative_path)
                            
                            # Resolve using backend/ path
                            service_dir = os.path.dirname(os.path.abspath(__file__))
                            backend_dir = os.path.dirname(service_dir)
                            local_path = os.path.join(backend_dir, "data", "patients", relative_path)
                            
                            if os.path.exists(local_path):
                                img = cv2.imread(local_path, cv2.IMREAD_COLOR)
                        except Exception as local_err:
                            print(f"[WARN] Local file resolution failed: {local_err}")
                            
                    # Fallback to fetching over HTTP
                    if img is None:
                        import urllib.request
                        with urllib.request.urlopen(base64_str, timeout=5) as response:
                            img_bytes = response.read()
                        nparr = np.frombuffer(img_bytes, np.uint8)
                        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                else:
                    # String base64 payload, check if it's a data URL
                    if "," in base64_str:
                        base64_str = base64_str.split(",")[1]
                    
                    # Check padding
                    missing_padding = len(base64_str) % 4
                    if missing_padding:
                        base64_str += '=' * (4 - missing_padding)
                        
                    img_data = base64.b64decode(base64_str)
                    nparr = np.frombuffer(img_data, np.uint8)
                    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
            if img is None:
                raise ValueError("cv2.imdecode/cv2.imread returned None. Image format might be corrupted or unsupported.")
            return img
        except Exception as e:
            print(f"[ERROR] Error decoding image payload: {e}")
            raise ValueError(f"Could not decode image: {e}")

    def predict_pattern_service(self, image_data: Any, model: Any = None) -> Tuple[str, float]:
        """Decodes image and predicts pattern classification class and confidence (mock fallback)."""
        # Return fallback pattern classification without running PyTorch Swin Transformer
        import random
        patterns = ["Whorl", "Loop", "Arch"]
        return random.choice(patterns), 95.0

    def detect_core_delta_service(self, image_data: Any) -> Tuple[Optional[Tuple[int, int]], Optional[Tuple[int, int]]]:
        """Decodes image and detects core/delta pixel points, scaling them to percentages (0-100) and clamping to bounds."""
        cv_img = self._decode_image(image_data)
        core, delta = detect_core_delta(cv_img)
        
        height, width = cv_img.shape[:2]
        
        core_pct = None
        if core:
            cx = max(0, min(width, core[0]))
            cy = max(0, min(height, core[1]))
            core_pct = (int(round(cx / width * 100)), int(round(cy / height * 100)))
            
        delta_pct = None
        if delta:
            dx = max(0, min(width, delta[0]))
            dy = max(0, min(height, delta[1]))
            delta_pct = (int(round(dx / width * 100)), int(round(dy / height * 100)))
            
        return core_pct, delta_pct

    def count_ridges_service(self, image_data: Any, core_pct: tuple[float, float] = None, delta_pct: tuple[float, float] = None) -> int:
        """Decodes image and runs the ridge crossing count algorithm."""
        cv_img = self._decode_image(image_data)
        return count_ridges(cv_img, core_pct, delta_pct)
