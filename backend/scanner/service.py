import threading
import base64
from io import BytesIO
from PIL import Image
from scanner.futronic import FutronicScanner

class ScannerService:
    """
    Service wrapper around FutronicScanner DLL class.
    Provides threat-safe, single-instance management and image format conversions.
    """
    def __init__(self):
        self.scanner = FutronicScanner()
        self.lock = threading.Lock()

    def initialize(self):
        """Initializes the scanner DLL instance under thread lock."""
        with self.lock:
            self.scanner.initialize()

    def terminate(self):
        """Terminates the scanner DLL instance under thread lock."""
        with self.lock:
            self.scanner.terminate()

    def force_abort(self):
        """Forces the scanner DLL to terminate, unblocking any pending capture call."""
        try:
            self.scanner.terminate()
        except Exception as e:
            print(f"❌ Error forcing scanner abort: {e}")

    def capture(self) -> dict:
        """
        Captures a fingerprint frame from the scanner,
        converts the grayscale NumPy array to a JPEG base64 Data URL, and returns it.
        """
        with self.lock:
            try:
                # 1. Capture grayscale numpy frame from DLL
                img_np = self.scanner.capture_frame()
                
                # 2. Convert to PIL Image in grayscale ('L')
                pil_img = Image.fromarray(img_np, mode='L')
                
                # 3. Convert image to JPEG bytes
                buffer = BytesIO()
                pil_img.save(buffer, format="JPEG", quality=95)
                jpeg_bytes = buffer.getvalue()
                
                # 4. Base64 encode the JPEG bytes
                base64_str = base64.b64encode(jpeg_bytes).decode('utf-8')
                image_data_uri = f"data:image/jpeg;base64,{base64_str}"
                
                return {
                    "status": "success",
                    "image": image_data_uri
                }
            except Exception as e:
                import traceback
                traceback.print_exc()
                return {
                    "status": "error",
                    "message": str(e)
                }

# Global singleton service instance
scanner_service = ScannerService()
