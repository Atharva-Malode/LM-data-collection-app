from typing import Optional, List, Any
from repositories.patient_repository import PatientRepository
from schemas.patient_schema import PatientJSON

class StorageService:
    """Service wrapping storage-related repository calls."""

    def __init__(self, patient_repo: PatientRepository):
        self.patient_repo = patient_repo

    def patient_exists(self, uuid: str) -> bool:
        return self.patient_repo.patient_exists(uuid)

    def save_patient_json(self, patient: PatientJSON) -> None:
        self.patient_repo.save_patient_json(patient)

    def read_patient_json(self, uuid: str) -> Optional[PatientJSON]:
        return self.patient_repo.read_patient_json(uuid)

    def save_fingerprint_image(self, uuid: str, filename: str, base64_str: str) -> Optional[str]:
        return self.patient_repo.save_patient_fingerprint_image(uuid, filename, base64_str)

    def save_scanner_images(self, uuid: str, db_key: str, base64_str: Optional[str], core: Optional[Any], delta: Optional[Any]) -> None:
        self.patient_repo.save_scanner_images(uuid, db_key, base64_str, core, delta)

    def get_patient_image_path(self, uuid: str, filename: str) -> Optional[str]:
        return self.patient_repo.get_patient_image_path(uuid, filename)

    def get_all_patient_uuids(self) -> List[str]:
        return self.patient_repo.list_all_patient_uuids()

    def delete_patient(self, uuid: str) -> None:
        self.patient_repo.delete_patient(uuid)
