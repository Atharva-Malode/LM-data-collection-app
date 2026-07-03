import ctypes
from ctypes import c_ulong, byref, create_string_buffer
import cv2
import numpy as np

# --------------------------------------------------
# DLL
# --------------------------------------------------

DLL_PATH = r"C:\Users\athar\OneDrive\Desktop\Atharva\lata_mangeshkar\test_scanner\FTRAPI.dll"

ftr = ctypes.WinDLL(DLL_PATH)

DWORD = c_ulong

# --------------------------------------------------
# Constants
# --------------------------------------------------

FTR_RETCODE_OK = 0

FTR_PARAM_IMAGE_WIDTH = 1
FTR_PARAM_IMAGE_HEIGHT = 2
FTR_PARAM_IMAGE_SIZE = 3
FTR_PARAM_CB_FRAME_SOURCE = 4

FSD_FUTRONIC_USB = 1

# --------------------------------------------------
# Function signatures
# --------------------------------------------------

ftr.FTRInitialize.restype = ctypes.c_int

ftr.FTRTerminate.restype = ctypes.c_int

ftr.FTRSetParam.argtypes = [
    ctypes.c_int,
    ctypes.c_ulong
]

ftr.FTRGetParam.argtypes = [
    ctypes.c_int,
    ctypes.c_void_p
]

ftr.FTRCaptureFrame.argtypes = [
    ctypes.c_void_p,
    ctypes.c_void_p
]

# --------------------------------------------------
# Initialize
# --------------------------------------------------

ret = ftr.FTRInitialize()

print("FTRInitialize =", ret)

if ret != FTR_RETCODE_OK:
    quit()

# USB scanner

ftr.FTRSetParam(
    FTR_PARAM_CB_FRAME_SOURCE,
    FSD_FUTRONIC_USB
)

# --------------------------------------------------
# Read image properties
# --------------------------------------------------

width = DWORD()
height = DWORD()
size = DWORD()

print("Reading scanner parameters...")

print("Width ret :",
      ftr.FTRGetParam(
          FTR_PARAM_IMAGE_WIDTH,
          byref(width)
      ))

print("Height ret:",
      ftr.FTRGetParam(
          FTR_PARAM_IMAGE_HEIGHT,
          byref(height)
      ))

print("Size ret  :",
      ftr.FTRGetParam(
          FTR_PARAM_IMAGE_SIZE,
          byref(size)
      ))

print()

print("Width :", width.value)
print("Height:", height.value)
print("Size  :", size.value)

# --------------------------------------------------
# Allocate image buffer
# --------------------------------------------------

buffer = create_string_buffer(size.value)

print()
print("===================================")
print("Place finger on scanner")
print("SPACE -> Save image")
print("ESC   -> Exit")
print("===================================")

# --------------------------------------------------
# Live Capture
# --------------------------------------------------

while True:

    ret = ftr.FTRCaptureFrame(
        None,
        buffer
    )

    if ret == FTR_RETCODE_OK:

        img = np.frombuffer(
            buffer.raw,
            dtype=np.uint8
        )

        img = img.reshape(
            height.value,
            width.value
        )

        display = cv2.resize(
            img,
            None,
            fx=2,
            fy=2,
            interpolation=cv2.INTER_NEAREST
        )

        cv2.imshow(
            "Live Fingerprint",
            display
        )

    else:

        print("Capture failed:", ret)

    key = cv2.waitKey(1) & 0xFF

    if key == 27:
        break

    if key == ord(' '):

        cv2.imwrite(
            "finger.bmp",
            img
        )

        print("Saved finger.bmp")

        break

# --------------------------------------------------
# Cleanup
# --------------------------------------------------

ftr.FTRTerminate()

cv2.destroyAllWindows()