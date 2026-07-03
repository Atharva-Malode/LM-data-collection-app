import os
import json
import base64
from io import BytesIO
from PIL import Image
from typing import Optional, List, Any
from schemas.patient_schema import PatientJSON
from schemas.fingerprint_schema import Point
from PIL import ImageDraw

class PatientRepository:
    """Manages raw JSON files and image storage for patients on the local disk."""

    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.environ.get("FING_DATA_DIR")
            
        if data_dir is None:
            import sys
            if getattr(sys, 'frozen', False):
                base_dir = os.path.dirname(sys.executable)
            else:
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.data_dir = os.path.join(base_dir, "data")
        else:
            self.data_dir = os.path.abspath(data_dir)
            
        self.patients_dir = os.path.join(self.data_dir, "patients")
        os.makedirs(self.patients_dir, exist_ok=True)

    def _get_patient_folder(self, uuid: str) -> str:
        """Returns the directory path for a patient UUID."""
        return os.path.join(self.patients_dir, uuid)

    def _get_patient_json_path(self, uuid: str) -> str:
        """Returns the patient.json file path for a patient UUID."""
        return os.path.join(self._get_patient_folder(uuid), "patient.json")

    def patient_exists(self, uuid: str) -> bool:
        """Checks if a patient folder and patient.json file exist."""
        return os.path.exists(self._get_patient_json_path(uuid))

    def save_patient_json(self, patient: PatientJSON) -> None:
        """Saves or updates the patient.json file."""
        folder_path = self._get_patient_folder(patient.uuid)
        os.makedirs(folder_path, exist_ok=True)
        
        json_path = self._get_patient_json_path(patient.uuid)
        
        # Write to JSON file with indentation for readability
        with open(json_path, "w", encoding="utf-8") as f:
            f.write(patient.model_dump_json(indent=2))
        print(f"[OK] Saved patient.json to {json_path}")

    def read_patient_json(self, uuid: str) -> Optional[PatientJSON]:
        """Reads patient.json and returns a PatientJSON object, or None if not found."""
        json_path = self._get_patient_json_path(uuid)
        if not os.path.exists(json_path):
            return None
            
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        return PatientJSON.model_validate(data)

    def save_patient_fingerprint_image(self, uuid: str, filename: str, base64_str: str) -> Optional[str]:
        """
        Decodes a base64 string and saves it as a JPEG image in the patient's folder.
        Returns the filename if successful, otherwise None.
        """
        folder_path = self._get_patient_folder(uuid)
        os.makedirs(folder_path, exist_ok=True)
        
        output_path = os.path.join(folder_path, filename)
        
        try:
            # Extract base64 payload if it's a data URI
            if "," in base64_str:
                base64_str = base64_str.split(",")[1]
            
            # Add padding if needed
            missing_padding = len(base64_str) % 4
            if missing_padding:
                base64_str += '=' * (4 - missing_padding)
                
            image_data = base64.b64decode(base64_str)
            image = Image.open(BytesIO(image_data))
            
            # Convert to RGB (JPEG does not support RGBA transparency)
            if image.mode in ("RGBA", "LA", "P"):
                image = image.convert("RGB")
            elif image.mode != "RGB":
                image = image.convert("RGB")
                
            image.save(output_path, "JPEG", quality=95)
            print(f"[OK] Saved fingerprint image: {output_path}")
        except Exception as e:
            print(f"[ERROR] Failed to save fingerprint image {filename} for patient {uuid}: {e}")
            return None

    def get_patient_image_path(self, uuid: str, filename: str) -> Optional[str]:
        """Returns the absolute file path of an image if it exists."""
        image_path = os.path.join(self._get_patient_folder(uuid), filename)
        if os.path.exists(image_path):
            return image_path
        return None

    def list_all_patient_uuids(self) -> List[str]:
        """Scans the patients directory and returns a list of folder names (UUIDs)."""
        if not os.path.exists(self.patients_dir):
            return []
        
        uuids = []
        for name in os.listdir(self.patients_dir):
            full_path = os.path.join(self.patients_dir, name)
            if os.path.isdir(full_path):
                # Verify that patient.json exists inside the folder
                if os.path.exists(os.path.join(full_path, "patient.json")):
                    uuids.append(name)
        return uuids

    def delete_patient(self, uuid: str) -> None:
        """Deletes the patient directory and all its files from disk."""
        folder_path = self._get_patient_folder(uuid)
        if os.path.exists(folder_path):
            import shutil
            shutil.rmtree(folder_path)
            print(f"[OK] Deleted patient directory: {folder_path}")

    def save_scanner_images(self, uuid: str, db_key: str, base64_str: Optional[str], core: Optional[Point], delta: Optional[Point]) -> None:
        """
        Saves the scanner image as:
        - {db_key}.jpg
        And generates/regenerates a single annotated copy if core/delta coordinates are provided:
        - {db_key}_annotated.jpg
        Automatically cleans up other formats (.bmp, _core, _delta) to maintain a maximum of 2 files.
        """
        folder_path = self._get_patient_folder(uuid)
        os.makedirs(folder_path, exist_ok=True)
        
        jpg_filename = f"{db_key}.jpg"
        jpg_path = os.path.join(folder_path, jpg_filename)
        
        # Clean up legacy formats to maintain strict file count
        for ext in [f"{db_key}.bmp", f"{db_key}_core.jpg", f"{db_key}_delta.jpg"]:
            legacy_path = os.path.join(folder_path, ext)
            if os.path.exists(legacy_path):
                try:
                    os.remove(legacy_path)
                except Exception as e:
                    print(f"[WARN] Failed to delete legacy file {legacy_path}: {e}")
        
        # 1. Decode and save original JPG image if new base64 is provided
        image = None
        if base64_str and (base64_str.startswith("data:image") or len(base64_str) > 100):
            try:
                # Extract base64 payload if it's a data URI
                payload = base64_str
                if "," in payload:
                    payload = payload.split(",")[1]
                
                # Add padding if needed
                missing_padding = len(payload) % 4
                if missing_padding:
                    payload += '=' * (4 - missing_padding)
                    
                image_data = base64.b64decode(payload)
                image = Image.open(BytesIO(image_data))
                
                # Convert to RGB (JPEG does not support RGBA transparency)
                if image.mode in ("RGBA", "LA", "P"):
                    image = image.convert("RGB")
                elif image.mode != "RGB":
                    image = image.convert("RGB")
                
                # Save JPG
                image.save(jpg_path, "JPEG", quality=95)
                print(f"[OK] Saved scanner image: {jpg_path}")
            except Exception as e:
                print(f"[ERROR] Failed to save raw scanner images for patient {uuid}: {e}")
                
        # 2. If no new base64 is provided, load the existing JPG to apply annotations
        if image is None:
            if os.path.exists(jpg_path):
                try:
                    image = Image.open(jpg_path)
                    if image.mode != "RGB":
                        image = image.convert("RGB")
                except Exception as e:
                    print(f"[ERROR] Failed to load existing image for annotations: {e}")

        # 3. Generate single annotated image if we have an image
        annotated_filename = f"{db_key}_annotated.jpg"
        annotated_path = os.path.join(folder_path, annotated_filename)
        
        if image is not None:
            if core is not None or delta is not None:
                try:
                    annotated_img = image.copy()
                    draw = ImageDraw.Draw(annotated_img)
                    width, height = annotated_img.size
                    
                    # Draw core (Red)
                    if core is not None:
                        px = int(round(core.x / 100.0 * width))
                        py = int(round(core.y / 100.0 * height))
                        r = 8
                        draw.ellipse([px - r, py - r, px + r, py + r], fill=(239, 68, 68), outline=(255, 255, 255), width=2)
                        
                    # Draw delta (Blue)
                    if delta is not None:
                        px = int(round(delta.x / 100.0 * width))
                        py = int(round(delta.y / 100.0 * height))
                        r = 8
                        draw.ellipse([px - r, py - r, px + r, py + r], fill=(59, 130, 246), outline=(255, 255, 255), width=2)
                        
                    annotated_img.save(annotated_path, "JPEG", quality=95)
                    print(f"[OK] Saved annotated image: {annotated_path}")
                except Exception as ex:
                    print(f"[ERROR] Error creating annotated image for {db_key}: {ex}")
            else:
                # If neither is marked, delete any stale annotated image
                if os.path.exists(annotated_path):
                    try:
                        os.remove(annotated_path)
                        print(f"[OK] Deleted stale annotated image: {annotated_path}")
                    except Exception as e:
                        print(f"[WARN] Failed to delete stale annotated image: {e}")
