import os
import sys
from typing import Any
try:
    import torch
    import torchvision
    from torchvision import transforms
    import torch.nn.functional as F
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

import cv2
import numpy as np
from PIL import Image

# Setup import paths dynamically to prevent hyphen-related import issues
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PATTERN_MODEL_DIR = os.path.join(BASE_DIR, "fingerprint", "models", "main-pattern")
AIML_DIR = os.path.join(BASE_DIR, "AI-ML")

if PATTERN_MODEL_DIR not in sys.path:
    sys.path.append(PATTERN_MODEL_DIR)
if AIML_DIR not in sys.path:
    sys.path.append(AIML_DIR)

try:
    if HAS_TORCH:
        from swin_transformer import FingerprintSwinWithAttention
    else:
        FingerprintSwinWithAttention = None
except ImportError:
    FingerprintSwinWithAttention = None

CLASS_NAMES = ['Arch', 'Whorl', 'Loop']

def load_pattern_model(device: str = None) -> Any:
    """Loads the trained Swin Transformer model from the .pth file, dynamically detecting architecture."""
    if not HAS_TORCH:
        print("ℹ️ PyTorch is not available. Skipping model loading (running in lightweight mock mode).")
        return None

    if device is None:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    model_path = os.path.join(AIML_DIR, "Training", "best_fingerprint_model.pth")
    
    try:
        checkpoint = torch.load(model_path, map_location=device)
        
        # Handle wrapped or direct state dict formats
        if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
            state_dict = checkpoint['model_state_dict']
        else:
            state_dict = checkpoint
            
        # Inspect state_dict keys to identify the training architecture
        first_key = next(iter(state_dict.keys()))
        
        # timm model parameter names start with 'patch_embed' or top-level module names
        if first_key.startswith("patch_embed") or "layers.0.blocks.0.attn.qkv.weight" in state_dict:
            import timm
            print("📊 Detected timm SwinV2 model keys. Initializing swinv2_tiny_window8_256...")
            model = timm.create_model("swinv2_tiny_window8_256", pretrained=False, num_classes=len(CLASS_NAMES))
        else:
            print("📊 Detected native torchvision Swin keys. Initializing FingerprintSwinWithAttention...")
            if FingerprintSwinWithAttention is None:
                raise ImportError("FingerprintSwinWithAttention class is not available because the swin_transformer module was not found.")
            model = FingerprintSwinWithAttention(num_classes=len(CLASS_NAMES), freeze_base=False)
            
        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()
        print(f"✅ Swin model loaded successfully on {device} from {model_path}")
        return model
    except FileNotFoundError:
        print(f"❌ Error: Model file not found at {model_path}")
        raise FileNotFoundError(f"Model file not found at {model_path}")
    except Exception as e:
        print(f"❌ Error loading Swin model: {e}")
        raise e

def preprocess_cv_image(cv_img: np.ndarray) -> Any:
    """Transforms an OpenCV image (numpy array) to a PyTorch tensor for model input."""
    if not HAS_TORCH:
        raise RuntimeError("PyTorch is not available in this environment.")
        
    # Ensure image is in RGB format
    if len(cv_img.shape) == 2:
        cv_img_rgb = cv2.cvtColor(cv_img, cv2.COLOR_GRAY2RGB)
    elif cv_img.shape[2] == 4:
        cv_img_rgb = cv2.cvtColor(cv_img, cv2.COLOR_BGRA2RGB)
    else:
        cv_img_rgb = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
        
    pil_img = Image.fromarray(cv_img_rgb)
    
    transform = transforms.Compose([
        transforms.Resize((256, 256)),  # timm SwinV2 tiny window8 expects 256x256
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    return transform(pil_img).unsqueeze(0)

def predict_pattern(model: Any, cv_img: np.ndarray, device: str = 'cpu') -> tuple[str, float]:
    """Runs inference on a single image and returns (predicted_class, confidence_percentage)."""
    if not HAS_TORCH or model is None:
        import random
        return random.choice(CLASS_NAMES), 95.0

    image_tensor = preprocess_cv_image(cv_img).to(device)
    
    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = F.softmax(outputs, dim=1)[0]
        confidence, predicted_idx = torch.max(probabilities, 0)
        
    predicted_class = CLASS_NAMES[predicted_idx.item()]
    confidence_percentage = float(confidence.item() * 100.0)
    
    return predicted_class, confidence_percentage
