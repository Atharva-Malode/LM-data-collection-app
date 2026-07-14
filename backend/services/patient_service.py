import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from schemas.patient_schema import PatientJSON, PatientSaveRequest, AdditionalDetailsJSON
from schemas.fingerprint_schema import FingerprintDatabase
from services.storage_service import StorageService
from services.excel_service import ExcelService

FINGER_MAP = {
    "Right Thumb": "right_thumb",
    "Right Index": "right_index",
    "Right Middle": "right_middle",
    "Right Ring": "right_ring",
    "Right Little": "right_little",
    "Left Thumb": "left_thumb",
    "Left Index": "left_index",
    "Left Middle": "left_middle",
    "Left Ring": "left_ring",
    "Left Little": "left_little",
    # Keep snake_case keys in case frontend sends snake_case
    "right_thumb": "right_thumb",
    "right_index": "right_index",
    "right_middle": "right_middle",
    "right_ring": "right_ring",
    "right_little": "right_little",
    "left_thumb": "left_thumb",
    "left_index": "left_index",
    "left_middle": "left_middle",
    "left_ring": "left_ring",
    "left_little": "left_little",
}

class PatientService:
    """Orchestrates patient business logic, mapping, and saving files/indexes."""

    def __init__(self, storage_service: StorageService, excel_service: ExcelService):
        self.storage_service = storage_service
        self.excel_service = excel_service

    def _generate_next_patient_id(self) -> str:
        """Finds the highest PATxxxx ID from existing JSON files and increments by 1."""
        uuids = self.storage_service.get_all_patient_uuids()
        max_num = 0
        
        for uuid in uuids:
            patient = self.storage_service.read_patient_json(uuid)
            if patient and patient.patient_id.startswith("PAT"):
                try:
                    num_part = int(patient.patient_id[3:])
                    if num_part > max_num:
                        max_num = num_part
                except ValueError:
                    pass
                    
        next_num = max_num + 1
        return f"PAT{next_num:04d}"

    def save_patient(self, payload: PatientSaveRequest) -> PatientJSON:
        """
        Creates or updates a patient record on disk (JSON + images) and syncs it with Excel.
        This operation is idempotent.
        """
        uuid = payload.id
        now_str = datetime.now().isoformat()
        
        # Check if patient exists
        existing = self.storage_service.read_patient_json(uuid)
        
        if existing:
            patient_id = existing.patient_id
            created_date = existing.created_date
            # Reuse existing fingerprints dictionary
            fingerprints_dict = {}
            for k, v in existing.fingerprints.items():
                fingerprints_dict[k] = v.copy() if hasattr(v, 'copy') else FingerprintDatabase.model_validate(v)
        else:
            patient_id = self._generate_next_patient_id()
            created_date = now_str
            fingerprints_dict = {}

        # Ensure all 10 fingers are present
        all_fingers = [
            "right_thumb", "right_index", "right_middle", "right_ring", "right_little",
            "left_thumb", "left_index", "left_middle", "left_ring", "left_little"
        ]
        for f in all_fingers:
            if f not in fingerprints_dict:
                fingerprints_dict[f] = FingerprintDatabase()

        # Input value cleaner to serialize empty inputs as "NA"
        def clean_val(val: Any) -> str:
            if val is None or str(val).strip() == "" or str(val).strip().upper() == "NA":
                return "NA"
            return str(val).strip()

        # Set up patient additional details
        additional_details = AdditionalDetailsJSON(
            hba1c_level=clean_val(payload.hba1cLevel),
            clinical_attachment_level=clean_val(payload.clinicalAttachmentLevel),
            probing_depth=clean_val(payload.probingDepth),
            smoking=clean_val(payload.smoking),
            alcohol_consumption=clean_val(payload.alcoholConsumption),
            chewing_habit=clean_val(payload.chewingHabit),
            medical_condition=clean_val(payload.medicalCondition),
            allergies=clean_val(payload.allergies),
            notes=clean_val(payload.notes)
        )

        # Process incoming fingerprints
        for fe_key, fe_fp in payload.fingerprintData.items():
            if fe_key not in FINGER_MAP:
                print(f"⚠️ Warning: Unknown finger key from frontend: {fe_key}")
                continue
                
            db_key = FINGER_MAP[fe_key]
            db_fp = fingerprints_dict[db_key]
            
            # Default or preserve existing values
            image_filename = db_fp.image_filename if db_fp.image_filename != "NA" else "NA"
            image_path = db_fp.image_path if db_fp.image_path != "NA" else "NA"
            annotated_image_path = db_fp.annotated_image_path if db_fp.annotated_image_path != "NA" else "NA"
            confidence = db_fp.confidence if db_fp.confidence != "NA" else "NA"
            
            has_image = False
            # Check if there is a new image payload (base64 string) or coordinates to save/annotate
            if fe_fp.image:
                is_base64 = fe_fp.image.startswith("data:image") or len(fe_fp.image) > 100
                
                self.storage_service.save_scanner_images(
                    uuid=uuid,
                    db_key=db_key,
                    base64_str=fe_fp.image if is_base64 else None,
                    core=fe_fp.core,
                    delta=fe_fp.delta
                )
                
                if is_base64:
                    image_filename = f"{db_key}.jpg"
                    confidence = 100.0
                else:
                    # Extract relative filename from URL if necessary
                    if "/" in fe_fp.image:
                        image_filename = fe_fp.image.split("/")[-1]
                    else:
                        image_filename = fe_fp.image
                has_image = True
            elif image_filename != "NA":
                has_image = True
                # If we have an existing image, but core/delta coordinates were updated, call save_scanner_images to regenerate annotations
                self.storage_service.save_scanner_images(
                    uuid=uuid,
                    db_key=db_key,
                    base64_str=None,
                    core=fe_fp.core,
                    delta=fe_fp.delta
                )

            # Calculate absolute image path if filename is present
            if has_image and image_filename and image_filename != "NA":
                patient_folder = self.storage_service.patient_repo._get_patient_folder(uuid)
                image_path = os.path.abspath(os.path.join(patient_folder, image_filename))
                if fe_fp.core is not None or fe_fp.delta is not None:
                    annotated_image_path = os.path.abspath(os.path.join(patient_folder, f"{db_key}_annotated.jpg"))
                else:
                    annotated_image_path = "NA"
            else:
                image_filename = "NA"
                image_path = "NA"
                annotated_image_path = "NA"
                confidence = "NA"

            # Extract core coordinates (percentages from frontend)
            core_x = int(fe_fp.core.x) if (fe_fp.core is not None and fe_fp.core.x is not None) else "NA"
            core_y = int(fe_fp.core.y) if (fe_fp.core is not None and fe_fp.core.y is not None) else "NA"
            
            # Extract delta coordinates (percentages from frontend)
            delta_x = int(fe_fp.delta.x) if (fe_fp.delta is not None and fe_fp.delta.x is not None) else "NA"
            delta_y = int(fe_fp.delta.y) if (fe_fp.delta is not None and fe_fp.delta.y is not None) else "NA"
            
            pattern = fe_fp.pattern if (fe_fp.pattern and fe_fp.pattern.strip()) else "NA"
            sub_pattern = fe_fp.subPattern if (fe_fp.subPattern and fe_fp.subPattern.strip()) else "NA"

            # Parse ridge count from manual input or fallback to auto count
            ridge_count = "NA"
            if fe_fp.ridgeManual1 and str(fe_fp.ridgeManual1).isdigit():
                ridge_count = int(fe_fp.ridgeManual1)
            elif fe_fp.ridgeAuto and str(fe_fp.ridgeAuto).isdigit():
                ridge_count = int(fe_fp.ridgeAuto)

            # Update database record
            fingerprints_dict[db_key] = FingerprintDatabase(
                image_filename=image_filename,
                image_path=image_path,
                annotated_image_path=annotated_image_path,
                pattern=pattern,
                sub_pattern=sub_pattern,
                confidence=confidence,
                core_x=core_x,
                core_y=core_y,
                delta_x=delta_x,
                delta_y=delta_y,
                ridge_count=ridge_count
            )

        # Build final PatientJSON object
        patient_json = PatientJSON(
            uuid=uuid,
            patient_id=patient_id,
            group=payload.group,
            created_date=created_date,
            updated_date=now_str,
            status=clean_val(payload.status),
            name=clean_val(payload.patientName),
            age_group=clean_val(payload.age),
            gender=clean_val(payload.gender),
            phone=clean_val(payload.phoneNumber),
            address=clean_val(payload.address),
            additional_details=additional_details,
            fingerprints=fingerprints_dict
        )

        # Save JSON source of truth
        self.storage_service.save_patient_json(patient_json)
        
        # Save index row in Excel
        self.excel_service.upsert_patient(patient_json)

        return patient_json

    def get_patient_record(self, uuid: str, base_url: str = "") -> Optional[Dict[str, Any]]:
        """Reads the patient JSON and maps it to a frontend-compatible record dict."""
        patient = self.storage_service.read_patient_json(uuid)
        if not patient:
            return None
            
        # Map to frontend structure
        fe_fingerprint_data = {}
        
        # Map all 10 fingers
        for fe_key in [
            "Right Thumb", "Right Index", "Right Middle", "Right Ring", "Right Little",
            "Left Thumb", "Left Index", "Left Middle", "Left Ring", "Left Little"
        ]:
            db_key = FINGER_MAP[fe_key]
            db_fp = patient.fingerprints.get(db_key)
            
            if db_fp and db_fp.image_filename and db_fp.image_filename != "NA":
                image_url = None
                if db_fp.image_filename:
                    # Provide full static access URL
                    image_url = f"{base_url}/patients/{patient.uuid}/{db_fp.image_filename}"
                    
                fe_fingerprint_data[fe_key] = {
                    "image": image_url,
                    "pattern": db_fp.pattern if db_fp.pattern != "NA" else "",
                    "subPattern": getattr(db_fp, "sub_pattern", "") if getattr(db_fp, "sub_pattern", "NA") != "NA" else "",
                    "core": {"x": db_fp.core_x, "y": db_fp.core_y} if (db_fp.core_x is not None and db_fp.core_x != "NA") else None,
                    "delta": {"x": db_fp.delta_x, "y": db_fp.delta_y} if (db_fp.delta_x is not None and db_fp.delta_x != "NA") else None,
                    "ridgeManual1": str(db_fp.ridge_count) if (db_fp.ridge_count is not None and db_fp.ridge_count != "NA" and str(db_fp.ridge_count).isdigit() and int(db_fp.ridge_count) > 0) else "",
                    "ridgeManual2": "",
                    "ridgeAuto": str(db_fp.ridge_count) if (db_fp.ridge_count is not None and db_fp.ridge_count != "NA" and str(db_fp.ridge_count).isdigit() and int(db_fp.ridge_count) > 0) else "",
                    "saved": True
                }
            else:
                fe_fingerprint_data[fe_key] = {
                    "image": None,
                    "pattern": "",
                    "subPattern": "",
                    "core": None,
                    "delta": None,
                    "ridgeManual1": "",
                    "ridgeManual2": "",
                    "ridgeAuto": "",
                    "saved": False
                }

        # Return hybrid schema to satisfy any request style
        return {
            # Frontend camelCase Fields
            "id": patient.uuid,
            "patientName": patient.name,
            "age": patient.age_group,
            "gender": patient.gender,
            "bloodGroup": "",
            "group": patient.group,
            "birthDate": "",
            "phoneNumber": patient.phone,
            "address": patient.address,
            "hba1cLevel": patient.additional_details.hba1c_level,
            "clinicalAttachmentLevel": patient.additional_details.clinical_attachment_level,
            "probingDepth": patient.additional_details.probing_depth,
            "smoking": patient.additional_details.smoking,
            "alcoholConsumption": patient.additional_details.alcohol_consumption,
            "medicalCondition": patient.additional_details.medical_condition,
            "chewingHabit": patient.additional_details.chewing_habit,
            "allergies": patient.additional_details.allergies,
            "notes": patient.additional_details.notes,
            "captureDate": patient.created_date,
            "status": patient.status,
            "fingerprintData": fe_fingerprint_data,
            
            # Backend snake_case Fields
            "uuid": patient.uuid,
            "patient_id": patient.patient_id,
            "name": patient.name,
            "age_group": patient.age_group,
            "phone": patient.phone,
            "created_date": patient.created_date,
            "updated_date": patient.updated_date,
            "additional_details": {
                "hba1c_level": patient.additional_details.hba1c_level,
                "clinical_attachment_level": patient.additional_details.clinical_attachment_level,
                "probing_depth": patient.additional_details.probing_depth,
                "smoking": patient.additional_details.smoking,
                "alcohol_consumption": patient.additional_details.alcohol_consumption,
                "chewing_habit": patient.additional_details.chewing_habit,
                "medical_condition": patient.additional_details.medical_condition,
                "allergies": patient.additional_details.allergies,
                "notes": patient.additional_details.notes
            },
            "fingerprints": {
                k: {
                    "image_filename": v.image_filename,
                    "image_path": v.image_path,
                    "annotated_image_path": getattr(v, "annotated_image_path", "NA"),
                    "pattern": v.pattern,
                    "sub_pattern": getattr(v, "sub_pattern", "NA"),
                    "confidence": v.confidence,
                    "core_x": v.core_x,
                    "core_y": v.core_y,
                    "delta_x": v.delta_x,
                    "delta_y": v.delta_y,
                    "ridge_count": v.ridge_count
                } for k, v in patient.fingerprints.items()
            }
        }

    def search_patients(
        self, 
        name: Optional[str] = None, 
        phone: Optional[str] = None, 
        patient_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Delegates searching to the Excel Index service."""
        return self.excel_service.search_patients(name=name, phone=phone, patient_id=patient_id)

    def delete_patient(self, uuid: str) -> None:
        """Deletes patient record files and rebuilds the Excel database index."""
        self.storage_service.delete_patient(uuid)
        self.excel_service.rebuild_excel_index()
