from fastapi import APIRouter, Request, Depends, HTTPException, UploadFile
from typing import Optional, Any
from schemas.prediction_schema import PatternResponse, CoreDeltaResponse, RidgeCountResponse
from schemas.response_schema import ApiResponse
from services.prediction_service import PredictionService

router = APIRouter()

def get_prediction_service() -> PredictionService:
    """Dependency injection provider for PredictionService."""
    return PredictionService()

async def get_request_image_data(request: Request) -> Any:
    """Helper to dynamically extract image bytes or base64 data depending on request Content-Type."""
    content_type = request.headers.get("content-type", "")
    
    if "application/json" in content_type:
        try:
            body = await request.json()
            image = body.get("image")
            if image:
                return image
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON body: {str(e)}")
            
    elif "multipart/form-data" in content_type:
        try:
            form = await request.form()
            file = form.get("file")
            if file and isinstance(file, UploadFile):
                return await file.read()
            # Also support 'image' key in form data
            image_form = form.get("image")
            if image_form and isinstance(image_form, UploadFile):
                return await image_form.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid Form data: {str(e)}")
            
    # Fallback/Try-guess parsing
    try:
        body = await request.json()
        image = body.get("image")
        if image:
            return image
    except Exception:
        try:
            form = await request.form()
            file = form.get("file") or form.get("image")
            if file and isinstance(file, UploadFile):
                return await file.read()
        except Exception:
            pass
            
    raise HTTPException(
        status_code=400, 
        detail="No image data provided. Please send JSON: {'image': 'base64_string'} or Form: file upload named 'file' or 'image'."
    )

@router.post("/predict-pattern", response_model=ApiResponse[PatternResponse])
async def predict_pattern_endpoint(
    request: Request,
    prediction_service: PredictionService = Depends(get_prediction_service)
):
    """
    Predicts the fingerprint pattern (Arch, Whorl, Loop) and confidence.
    Accepts either base64 JSON payload or direct multipart file upload.
    """
    image_data = await get_request_image_data(request)

    try:
        pattern, confidence = prediction_service.predict_pattern_service(image_data, None)
        
        return ApiResponse(
            success=True,
            message="Fingerprint pattern predicted successfully",
            data=PatternResponse(pattern=pattern, confidence=confidence)
        )
    except HTTPException:
        raise
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@router.post("/predict-core-delta", response_model=ApiResponse[CoreDeltaResponse])
async def predict_core_delta_endpoint(
    request: Request,
    prediction_service: PredictionService = Depends(get_prediction_service)
):
    """
    Detects Core and Delta singular points.
    Accepts either base64 JSON payload or direct multipart file upload.
    """
    image_data = await get_request_image_data(request)

    try:
        core, delta = prediction_service.detect_core_delta_service(image_data)
        
        return ApiResponse(
            success=True,
            message="Core and Delta singular points detected successfully",
            data=CoreDeltaResponse(
                core_x=core[0] if core else None,
                core_y=core[1] if core else None,
                delta_x=delta[0] if delta else None,
                delta_y=delta[1] if delta else None
            )
        )
    except HTTPException:
        raise
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Singular point detection error: {str(e)}")

@router.post("/predict-ridge-count", response_model=ApiResponse[RidgeCountResponse])
async def predict_ridge_count_endpoint(
    request: Request,
    prediction_service: PredictionService = Depends(get_prediction_service)
):
    """
    Counts ridges between Core and Delta.
    Accepts either base64 JSON payload (with optional core/delta coords) or direct multipart file upload.
    """
    core_pct = None
    delta_pct = None
    image_data = None
    
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            image_data = body.get("image")
            core_x = body.get("core_x")
            core_y = body.get("core_y")
            delta_x = body.get("delta_x")
            delta_y = body.get("delta_y")
            if core_x is not None and core_y is not None:
                core_pct = (float(core_x), float(core_y))
            if delta_x is not None and delta_y is not None:
                delta_pct = (float(delta_x), float(delta_y))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON body: {str(e)}")
            
    if not image_data:
        image_data = await get_request_image_data(request)

    try:
        ridge_count = prediction_service.count_ridges_service(image_data, core_pct, delta_pct)
        
        return ApiResponse(
            success=True,
            message="Ridge count completed successfully",
            data=RidgeCountResponse(ridge_count=ridge_count)
        )
    except HTTPException:
        raise
    except ValueError as ve:
         raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Ridge counting error: {str(e)}")
