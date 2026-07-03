import ctypes
from ctypes import c_ulong, byref, create_string_buffer
import numpy as np
import os
import sys

# --------------------------------------------------
# Constants
# --------------------------------------------------
FTR_RETCODE_OK = 0
FTR_PARAM_IMAGE_WIDTH = 1
FTR_PARAM_IMAGE_HEIGHT = 2
FTR_PARAM_IMAGE_SIZE = 3
FTR_PARAM_CB_FRAME_SOURCE = 4
FSD_FUTRONIC_USB = 1

def get_dll_path():
    # If running in a PyInstaller bundle, look in the temporary bundle directory
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        # Otherwise look in the backend directory
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    local_path = os.path.join(base_path, "scanner", "FTRAPI.dll")
    if os.path.exists(local_path):
        return local_path
    
    # Fallback to the original user's desktop path in development
    return r"C:\Users\athar\OneDrive\Desktop\Atharva\lata_mangeshkar\test_scanner\FTRAPI.dll"

class FutronicScanner:
    """
    Wraps dll calls to the Futronic Fingerprint SDK using ctypes.
    Ensures DLL is loaded and initialized properly.
    """
    def __init__(self, dll_path: str = None):
        self.dll_path = dll_path if dll_path is not None else get_dll_path()
        self.ftr = None
        self.width = 0
        self.height = 0
        self.size = 0
        self.initialized = False

    def initialize(self):
        """Initializes the Futronic SDK API and reads parameters."""
        if self.initialized:
            return

        try:
            self.ftr = ctypes.WinDLL(self.dll_path)
        except Exception as e:
            raise RuntimeError(f"Failed to load Futronic DLL from {self.dll_path}: {e}")

        # Set return and argument types
        self.ftr.FTRInitialize.restype = ctypes.c_int
        self.ftr.FTRTerminate.restype = ctypes.c_int
        
        self.ftr.FTRSetParam.argtypes = [
            ctypes.c_int,
            ctypes.c_ulong
        ]
        
        self.ftr.FTRGetParam.argtypes = [
            ctypes.c_int,
            ctypes.c_void_p
        ]
        
        self.ftr.FTRCaptureFrame.argtypes = [
            ctypes.c_void_p,
            ctypes.c_void_p
        ]

        # Call Initialize
        ret = self.ftr.FTRInitialize()
        if ret != FTR_RETCODE_OK:
            raise RuntimeError(f"FTRInitialize failed with code: {ret}")

        # Set USB Scanner frame source parameter
        self.ftr.FTRSetParam(
            FTR_PARAM_CB_FRAME_SOURCE,
            FSD_FUTRONIC_USB
        )

        # Read image properties from scanner
        width_val = c_ulong()
        height_val = c_ulong()
        size_val = c_ulong()

        self.ftr.FTRGetParam(FTR_PARAM_IMAGE_WIDTH, byref(width_val))
        self.ftr.FTRGetParam(FTR_PARAM_IMAGE_HEIGHT, byref(height_val))
        self.ftr.FTRGetParam(FTR_PARAM_IMAGE_SIZE, byref(size_val))

        self.width = width_val.value
        self.height = height_val.value
        self.size = size_val.value

        # Fallbacks in case properties are not read correctly
        if self.width == 0 or self.height == 0 or self.size == 0:
            self.width = 320
            self.height = 480
            self.size = 153600

        self.initialized = True
        print(f"[OK] Futronic SDK Initialized: Width={self.width}, Height={self.height}, Size={self.size}")

    def capture_frame(self) -> np.ndarray:
        """
        Captures a frame from the scanner.
        Blocks until a finger is placed and captured.
        Returns:
            np.ndarray: Grayscale fingerprint image (height, width)
        """
        if not self.initialized:
            raise RuntimeError("Futronic scanner is not initialized.")

        buffer = create_string_buffer(self.size)
        ret = self.ftr.FTRCaptureFrame(None, buffer)

        if ret != FTR_RETCODE_OK:
            raise RuntimeError(f"FTRCaptureFrame failed with code: {ret}")

        # Convert raw buffer to numpy array
        img = np.frombuffer(buffer.raw, dtype=np.uint8)
        img = img.reshape(self.height, self.width)
        return img

    def terminate(self):
        """Cleanly terminates the scanner interface."""
        if not self.initialized:
            return
        
        try:
            ret = self.ftr.FTRTerminate()
            print(f"[STOP] Futronic SDK Terminated with code: {ret}")
        except Exception as e:
            print(f"[ERROR] Failed to terminate Futronic SDK: {e}")
        finally:
            self.initialized = False
