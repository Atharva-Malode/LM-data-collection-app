from fastapi import APIRouter, Request, Depends, HTTPException
from typing import List, Optional, Any
from schemas.patient_schema import PatientSaveRequest, PatientSearchResponse
from schemas.response_schema import ApiResponse
from repositories.patient_repository import PatientRepository
from repositories.excel_repository import ExcelRepository
from services.storage_service import StorageService
from services.excel_service import ExcelService
from services.patient_service import PatientService

router = APIRouter()

# Initialize components (Clean Architecture)
_patient_repo = PatientRepository()
_excel_repo = ExcelRepository()
_storage_service = StorageService(_patient_repo)
_excel_service = ExcelService(_excel_repo, _patient_repo)
_patient_service = PatientService(_storage_service, _excel_service)

def get_patient_service() -> PatientService:
    """Dependency injection provider for PatientService."""
    return _patient_service

def get_excel_service() -> ExcelService:
    """Dependency injection provider for ExcelService."""
    return _excel_service

@router.post("/patient/save", response_model=ApiResponse[Any])
async def save_patient_endpoint(
    request: Request,
    payload: PatientSaveRequest,
    patient_service: PatientService = Depends(get_patient_service)
):
    """
    Saves a new patient or updates an existing patient.
    Generates a human-readable Patient ID if this is a new registration.
    """
    try:
        saved_record = patient_service.save_patient(payload)
        base_url = str(request.base_url).rstrip("/")
        # Return complete mapped record
        mapped_record = patient_service.get_patient_record(saved_record.uuid, base_url=base_url)
        
        return ApiResponse(
            success=True,
            message="Patient record saved successfully",
            data=mapped_record
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save patient: {str(e)}")

@router.get("/patient/search", response_model=ApiResponse[List[PatientSearchResponse]])
async def search_patients_endpoint(
    name: Optional[str] = None,
    phone: Optional[str] = None,
    patient_id: Optional[str] = None,
    patient_service: PatientService = Depends(get_patient_service)
):
    """
    Searches patients using the patients.xlsx index.
    Filters are applied as case-insensitive substrings.
    """
    try:
        results = patient_service.search_patients(name=name, phone=phone, patient_id=patient_id)
        return ApiResponse(
            success=True,
            message=f"Found {len(results)} patients",
            data=results
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/patient/{uuid}", response_model=ApiResponse[Any])
async def get_patient_endpoint(
    uuid: str,
    request: Request,
    patient_service: PatientService = Depends(get_patient_service)
):
    """
    Fetches the complete patient JSON record by UUID.
    Includes full absolute URLs for all stored fingerprint image assets.
    """
    base_url = str(request.base_url).rstrip("/")
    record = patient_service.get_patient_record(uuid, base_url=base_url)
    if not record:
        raise HTTPException(status_code=404, detail=f"Patient record with UUID {uuid} not found")
        
    return ApiResponse(
        success=True,
        message="Patient record retrieved successfully",
        data=record
    )

@router.put("/patient/{uuid}", response_model=ApiResponse[Any])
async def update_patient_endpoint(
    uuid: str,
    request: Request,
    payload: PatientSaveRequest,
    patient_service: PatientService = Depends(get_patient_service)
):
    """
    Updates an existing patient record.
    The UUID in path and body must match.
    """
    if payload.id != uuid:
        raise HTTPException(status_code=400, detail="Path parameter 'uuid' and body parameter 'id' must match")
        
    if not _storage_service.patient_exists(uuid):
        raise HTTPException(status_code=404, detail=f"Patient record with UUID {uuid} not found")

    try:
        saved_record = patient_service.save_patient(payload)
        base_url = str(request.base_url).rstrip("/")
        mapped_record = patient_service.get_patient_record(saved_record.uuid, base_url=base_url)
        
        return ApiResponse(
            success=True,
            message="Patient record updated successfully",
            data=mapped_record
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update patient: {str(e)}")

@router.delete("/patient/{uuid}", response_model=ApiResponse[Any])
async def delete_patient_endpoint(
    uuid: str,
    patient_service: PatientService = Depends(get_patient_service)
):
    """
    Deletes a patient record (JSON files & static image folder) from disk
    and syncs deletion with the Excel database index.
    """
    if not _storage_service.patient_exists(uuid):
        raise HTTPException(status_code=404, detail=f"Patient record with UUID {uuid} not found")
        
    try:
        patient_service.delete_patient(uuid)
        return ApiResponse(
            success=True,
            message=f"Patient record {uuid} deleted successfully",
            data=None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete patient: {str(e)}")
