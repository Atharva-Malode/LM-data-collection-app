from typing import List, Dict, Any, Optional
from repositories.excel_repository import ExcelRepository
from repositories.patient_repository import PatientRepository
from schemas.patient_schema import PatientJSON

class ExcelService:
    """Service coordinates indexing and recovery of patients.xlsx from source-of-truth JSON."""

    def __init__(self, excel_repo: ExcelRepository, patient_repo: PatientRepository):
        self.excel_repo = excel_repo
        self.patient_repo = patient_repo

    def upsert_patient(self, patient: PatientJSON) -> None:
        self.excel_repo.upsert_patient(patient)

    def search_patients(
        self, 
        name: Optional[str] = None, 
        phone: Optional[str] = None, 
        patient_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return self.excel_repo.search_patients(name=name, phone=phone, patient_id=patient_id)

    def rebuild_excel_index(self) -> None:
        """Reads all patient JSON files on disk and regenerates the Excel index from scratch."""
        print("[INFO] Rebuilding Excel index from patient JSON files...")
        self.excel_repo.clear_excel_rows()
        
        uuids = self.patient_repo.list_all_patient_uuids()
        count = 0
        for uuid in uuids:
            patient = self.patient_repo.read_patient_json(uuid)
            if patient:
                self.excel_repo.upsert_patient(patient)
                count += 1
                
        print(f"[OK] Excel index successfully rebuilt with {count} records.")
