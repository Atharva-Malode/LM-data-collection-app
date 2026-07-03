import os
import sys
import base64
from fastapi.testclient import TestClient

# Make sure imports resolved correctly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Isolate testing data directory
os.environ["FING_DATA_DIR"] = os.path.join(BASE_DIR, "data_test")

from main import app

def get_test_image_base64() -> str:
    """Helper to load a test fingerprint image and encode it as a base64 Data URL."""
    project_root = os.path.dirname(BASE_DIR)
    # Use the sample image in AI-ML/images
    img_path = os.path.join(project_root, "AI-ML", "images", "1_2_left_real_ZK9500.bmp")
    if not os.path.exists(img_path):
        # Fallback to pattern model directory image
        img_path = os.path.join(project_root, "fingerprint", "models", "main-pattern", "fingerprint.bmp")
        
    if not os.path.exists(img_path):
        # Search for any existing patient fingerprint image
        patients_dir = os.path.join(BASE_DIR, "data", "patients")
        if os.path.exists(patients_dir):
            for r, d, fs in os.walk(patients_dir):
                for f in fs:
                    if (f.endswith(".bmp") or f.endswith(".jpg")) and "_core" not in f and "_delta" not in f:
                        img_path = os.path.join(r, f)
                        break
                if os.path.exists(img_path) and not img_path.endswith(".bmp") and not img_path.endswith(".jpg"):
                    continue
                if os.path.exists(img_path):
                    break
                    
    with open(img_path, "rb") as f:
        img_bytes = f.read()
        
    encoded = base64.b64encode(img_bytes).decode("utf-8")
    return f"data:image/bmp;base64,{encoded}"

def test_predictions(client):
    print("\n--- Testing Prediction APIs ---")
    img_b64 = get_test_image_base64()
    
    # 1. Test Pattern Prediction
    print("Testing POST /predict-pattern...")
    resp = client.post("/predict-pattern", json={"image": img_b64})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    print(f"[OK] Pattern Result: {data['data']}")
    
    # 2. Test Core/Delta Detection
    print("Testing POST /predict-core-delta...")
    resp = client.post("/predict-core-delta", json={"image": img_b64})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    print(f"[OK] Core/Delta Result: {data['data']}")
    
    # 3. Test Ridge Count
    print("Testing POST /predict-ridge-count...")
    resp = client.post("/predict-ridge-count", json={
        "image": img_b64,
        "core_x": 50.0,
        "core_y": 50.0,
        "delta_x": 70.0,
        "delta_y": 70.0
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    print(f"[OK] Ridge Count Result: {data['data']}")

def test_patient_crud(client):
    print("\n--- Testing Patient CRUD & Indexing APIs ---")
    img_b64 = get_test_image_base64()
    
    test_uuid = "test-uuid-12345-abcde"
    
    # Save payload (simulating Next.js frontend state structure)
    save_payload = {
        "id": test_uuid,
        "patientName": "John Doe Test",
        "age": "30-40",
        "gender": "Male",
        "bloodGroup": "O+",
        "group": "B",
        "birthDate": "1996-01-01",
        "phoneNumber": "9876543210",
        "address": "123 Bio Street",
        "smoking": "No",
        "alcoholConsumption": "Occasional",
        "medicalCondition": "None",
        "chewingHabit": "None",
        "allergies": "Peanuts",
        "notes": "Testing backend integration save.",
        "status": "IN_PROGRESS",
        "fingerprintData": {
            "Left Thumb": {
                "image": img_b64,
                "pattern": "Whorl",
                "subPattern": "Plain Whorl",
                "core": {"x": 42.5, "y": 38.0},
                "delta": {"x": 65.0, "y": 62.0},
                "ridgeManual1": "14",
                "ridgeManual2": "",
                "ridgeAuto": "12",
                "saved": True
            }
        }
    }
    
    # 1. Test POST /patient/save
    print("Testing POST /patient/save...")
    resp = client.post("/patient/save", json=save_payload)
    assert resp.status_code == 200, resp.text
    save_data = resp.json()
    assert save_data["success"] is True
    patient_record = save_data["data"]
    assert patient_record["id"] == test_uuid
    assert patient_record["patient_id"].startswith("PAT")
    print(f"[OK] Saved patient. Generated ID: {patient_record['patient_id']}")
    
    # Verify image was saved
    left_thumb_path = os.path.join(BASE_DIR, "data", "patients", test_uuid, "left_thumb.jpg")
    assert os.path.exists(left_thumb_path), "Fingerprint image file was not saved to disk!"
    print("[OK] Verified fingerprint image decoded and saved to disk.")
    
    # Verify Excel was saved
    excel_path = os.path.join(BASE_DIR, "data", "patients.xlsx")
    assert os.path.exists(excel_path), "patients.xlsx index sheet was not created!"
    print("[OK] Verified patients.xlsx index updated.")

    # 2. Test GET /patient/{uuid}
    print(f"Testing GET /patient/{test_uuid}...")
    resp = client.get(f"/patient/{test_uuid}")
    assert resp.status_code == 200, resp.text
    get_data = resp.json()
    assert get_data["success"] is True
    record = get_data["data"]
    assert record["patientName"] == "John Doe Test"
    # Check absolute image path serving
    left_thumb_image_url = record["fingerprintData"]["Left Thumb"]["image"]
    assert left_thumb_image_url.startswith("http://"), f"Image URL is not absolute: {left_thumb_image_url}"
    print(f"[OK] Retrieved Patient. Mapped Image URL: {left_thumb_image_url}")

    # 3. Test PUT /patient/{uuid} (Updates details)
    print(f"Testing PUT /patient/{test_uuid}...")
    save_payload["patientName"] = "John Doe Updated"
    resp = client.put(f"/patient/{test_uuid}", json=save_payload)
    assert resp.status_code == 200, resp.text
    put_data = resp.json()
    assert put_data["success"] is True
    assert put_data["data"]["patientName"] == "John Doe Updated"
    print("[OK] Patient record updated successfully.")

    # 4. Test GET /patient/search
    print("Testing GET /patient/search...")
    # Search by name
    resp = client.get("/patient/search", params={"name": "Doe"})
    assert resp.status_code == 200, resp.text
    search_data = resp.json()
    assert len(search_data["data"]) >= 1
    assert search_data["data"][0]["uuid"] == test_uuid
    print(f"[OK] Search by Name results: {search_data['data']}")
    
    # Search by Phone
    resp = client.get("/patient/search", params={"phone": "98765"})
    assert resp.status_code == 200, resp.text
    search_data = resp.json()
    assert len(search_data["data"]) >= 1
    print(f"[OK] Search by Phone results: {search_data['data']}")

    # Clean up test files so we don't dirty the working directories
    print("Cleaning up test patient files...")
    folder_path = os.path.join(BASE_DIR, "data", "patients", test_uuid)
    if os.path.exists(folder_path):
        import shutil
        shutil.rmtree(folder_path)
    
    # Rebuild index to remove test row from Excel
    from routes.patient_routes import _excel_service
    _excel_service.rebuild_excel_index()
    print("[OK] Cleanup and Excel sync completed.")

if __name__ == "__main__":
    print("Starting backend tests with active Lifespan Context...")
    # Use context manager to trigger lifespan startup and shutdown
    with TestClient(app) as test_client:
        test_predictions(test_client)
        test_patient_crud(test_client)
    print("\n[SUCCESS] ALL TESTS PASSED SUCCESSFULLY! The backend is 100% compliant.")
