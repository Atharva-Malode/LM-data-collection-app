import os
import sys

# =====================================================
# SYSTEM PATH SETUP (Hyphenated Import Workaround)
# =====================================================
if getattr(sys, 'frozen', False):
    PROJECT_ROOT = sys._MEIPASS
    BASE_DIR = os.path.join(PROJECT_ROOT, "backend")
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # points to backend/
    PROJECT_ROOT = os.path.dirname(BASE_DIR)               # points to project root

AIML_DIR = os.path.join(PROJECT_ROOT, "AI-ML")
PATTERN_MODEL_DIR = os.path.join(PROJECT_ROOT, "fingerprint", "models", "main-pattern")

# Insert these directories at the front of sys.path to allow clean imports
for path in [PROJECT_ROOT, AIML_DIR, PATTERN_MODEL_DIR]:
    if path not in sys.path:
        sys.path.insert(0, path)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
# Pattern prediction model loader import bypassed
from routes.patient_routes import router as patient_router
from routes.prediction_routes import router as prediction_router
from scanner import scanner_router
from scanner.service import scanner_service

# =====================================================
# LIFESPAN MANAGEMENT (Load AI Model Once on Startup)
# =====================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[START] Starting FING application backend...")
    
    # 1. AI pattern prediction model is disabled to remove model prediction latency/load
    app.state.pattern_model = None
    print("[INFO] Running in lightweight mode (PyTorch models bypassed).")
        
    # 2. Rebuild the Excel index from local patient JSON files (Self-Healing Sync)
    try:
        from routes.patient_routes import _excel_service
        _excel_service.rebuild_excel_index()
    except Exception as e:
        print(f"[WARN] Auto-syncing Excel index failed on startup: {e}")
        
    # 3. Initialize the Futronic scanner SDK
    try:
        scanner_service.initialize()
        print("[OK] Futronic fingerprint scanner initialized on startup.")
    except Exception as e:
        print(f"[WARN] Futronic scanner initialization failed on startup: {e}")
        
    yield
    
    # Terminate the Futronic scanner SDK on shutdown
    print("[STOP] Shutting down FING Application Backend...")
    try:
        scanner_service.terminate()
        print("[OK] Futronic fingerprint scanner terminated on shutdown.")
    except Exception as e:
        print(f"[WARN] Futronic scanner termination failed on shutdown: {e}")

# Initialize FastAPI App
app = FastAPI(
    title="FING Backend",
    description="Local backend managing patient registration, file-based JSON storage, and AI analysis pipelines.",
    version="1.0.0",
    lifespan=lifespan
)

# =====================================================
# MIDDLEWARE & CORS CONFIGURATION
# =====================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow direct connections from Next.js on localhost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve patient fingerprint images saved under FING_DATA_DIR/patients/ at /patients/
data_dir_env = os.environ.get("FING_DATA_DIR")
if data_dir_env:
    patients_data_dir = os.path.join(os.path.abspath(data_dir_env), "patients")
else:
    if getattr(sys, 'frozen', False):
        patients_data_dir = os.path.join(os.path.dirname(sys.executable), "data", "patients")
    else:
        patients_data_dir = os.path.join(BASE_DIR, "data", "patients")
os.makedirs(patients_data_dir, exist_ok=True)
app.mount("/patients", StaticFiles(directory=patients_data_dir), name="patients")

# =====================================================
# ROUTES INCLUSION
# =====================================================
app.include_router(patient_router, tags=["Patients"])
app.include_router(prediction_router, tags=["Predictions"])
app.include_router(scanner_router, tags=["Scanner"])

# =====================================================
# FRONTEND STATIC FILES SERVING & ROUTING
# =====================================================
from fastapi.responses import FileResponse

# Check if Next.js export assets directory exists
frontend_out_dir = os.path.join(PROJECT_ROOT, "frontend", "out")
next_assets_dir = os.path.join(frontend_out_dir, "_next")

if os.path.exists(next_assets_dir):
    app.mount("/_next", StaticFiles(directory=next_assets_dir), name="next-assets")

@app.get("/health", tags=["Health"])
def health_check():
    """Simple health check endpoint."""
    return {
        "status": "online",
        "app": "FING",
        "storage": "Local JSON & Excel Index",
        "models_cached": app.state.pattern_model is not None
    }

@app.get("/{catchall:path}", tags=["Frontend"])
async def serve_frontend(catchall: str):
    """Serves the Next.js exported static frontend app."""
    if not os.path.exists(frontend_out_dir):
        # Fallback if frontend is not built/packaged
        return {"detail": f"Frontend out directory not found at {frontend_out_dir}. Please build the frontend first."}

    # 1. Clean path
    cleaned_path = catchall.strip("/")
    if not cleaned_path:
        # Serve root page
        return FileResponse(os.path.join(frontend_out_dir, "index.html"))

    # 2. Check if it's a direct file path (e.g. favicon.ico, images)
    file_path = os.path.join(frontend_out_dir, cleaned_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    # 3. Check for exported HTML pages (Next.js exports `/new-patient` as `/new-patient.html`)
    html_page = file_path + ".html"
    if os.path.isfile(html_page):
        return FileResponse(html_page)

    # 4. Check for nested page index.html
    html_page_nested = os.path.join(file_path, "index.html")
    if os.path.isfile(html_page_nested):
        return FileResponse(html_page_nested)

    # 5. Default fallback to root index.html for SPA router fallback
    return FileResponse(os.path.join(frontend_out_dir, "index.html"))

# =====================================================
# PROGRAMMATIC UVICORN EXECUTION
# =====================================================
if __name__ == "__main__":
    import multiprocessing
    multiprocessing.freeze_support()
    import uvicorn
    import argparse
    
    parser = argparse.ArgumentParser(description="Start FastAPI backend server")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind uvicorn server")
    args = parser.parse_args()
    
    print(f"[*] Starting backend server on port {args.port}...")
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")
