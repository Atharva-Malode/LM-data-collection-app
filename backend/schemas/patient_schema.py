from pydantic import BaseModel, Field, field_validator
from typing import Dict, Optional, List
from datetime import datetime
from .fingerprint_schema import FingerprintFrontend, FingerprintDatabase

class AdditionalDetailsJSON(BaseModel):
    """Additional medical/lifestyle details stored in patient.json."""
    hba1c_level: str = "NA"
    clinical_attachment_level: str = "NA"
    probing_depth: str = "NA"
    smoking: str = "NA"
    alcohol_consumption: str = "NA"
    chewing_habit: str = "NA"
    medical_condition: str = "NA"
    allergies: str = "NA"
    notes: str = "NA"

class PatientJSON(BaseModel):
    """The exact schema stored in data/patients/<uuid>/patient.json."""
    uuid: str
    patient_id: str
    group: str
    created_date: str
    updated_date: str
    status: str = "IN_PROGRESS"
    name: str = "NA"
    age_group: str = "NA"
    gender: str = "NA"
    phone: str = "NA"
    address: str = "NA"
    additional_details: AdditionalDetailsJSON = Field(default_factory=AdditionalDetailsJSON)
    fingerprints: Dict[str, FingerprintDatabase] = Field(default_factory=dict)

    @field_validator('group')
    @classmethod
    def validate_group(cls, v):
        if v not in ('A', 'B', 'C', 'D'):
            raise ValueError('Group must be A, B, C, or D')
        return v

class PatientSaveRequest(BaseModel):
    """Incoming request payload from the frontend to save/update a patient."""
    id: str  # Frontend calls it 'id' (UUID)
    patientName: str = ""
    age: str = ""
    gender: str = ""
    bloodGroup: str = ""
    group: str
    birthDate: str = ""
    phoneNumber: str = ""
    address: str = ""
    
    # Additional Details
    hba1cLevel: str = ""
    clinicalAttachmentLevel: str = ""
    probingDepth: str = ""
    smoking: str = ""
    alcoholConsumption: str = ""
    medicalCondition: str = ""
    chewingHabit: str = ""
    allergies: str = ""
    notes: str = ""

    # Status
    status: str = "IN_PROGRESS"
    
    # Fingerprints keyed by FingerName (e.g. "Right Thumb", "Left Index")
    fingerprintData: Dict[str, FingerprintFrontend] = Field(default_factory=dict)

    @field_validator('group')
    @classmethod
    def validate_group(cls, v):
        if v not in ('A', 'B', 'C', 'D'):
            raise ValueError('Group must be A, B, C, or D')
        return v

class PatientSearchResponse(BaseModel):
    """Response record returned by the search API."""
    uuid: str
    patient_id: str
    group: str
    name: str
    phone: str
    status: str
