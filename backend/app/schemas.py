from datetime import date, datetime
from typing import List, Optional, Literal, Any, Dict
from pydantic import BaseModel, Field, field_validator
import re


class OCRRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64 encoded image string (data:image/... or raw)")
    mock_plate: Optional[str] = Field(None, description="Optional override vehicle number for quick testing")


class OCRResult(BaseModel):
    vehicle_number: str = Field(..., description="Extracted standard vehicle registration number")
    confidence: float = Field(..., description="OCR extraction confidence score (0-100)")
    raw_text: Optional[str] = Field(None, description="Raw unnormalized OCR text string")
    method_used: str = Field("TESSERACT_OCR", description="OCR pipeline engine used")


class ComplianceVerifyRequest(BaseModel):
    vehicle_number: str = Field(..., description="Standard vehicle registration plate, e.g. AP31TJ9988")
    expected_vendor_code: str = Field(..., description="Registered plant vendor code, e.g. VEND-TATALOG-01")
    guard_id: str = Field(..., description="Active duty security guard identifier")
    gate_id: str = Field("GATE-NORTH-01", description="Plant gate terminal identifier")
    movement_type: Literal["ENTRY", "EXIT"] = Field("ENTRY", description="Direction of movement")
    ocr_confidence: Optional[float] = Field(None, description="Confidence percentage from OCR step")
    simulate_scenario: Optional[str] = Field(None, description="Optional dummy simulation: 'ALLOWED', 'EXPIRED_PUC', 'SUSPENDED_RC', 'NOT_FOUND', 'INACTIVE'")

    @field_validator("vehicle_number")
    @classmethod
    def clean_vehicle_number(cls, v: str) -> str:
        # Strip whitespace, dashes, and ensure uppercase
        cleaned = re.sub(r"[^A-Za-z0-9]", "", v).upper()
        if not cleaned:
            raise ValueError("Vehicle number cannot be empty")
        return cleaned


class SurepassParsedData(BaseModel):
    rc_number: str
    owner_name: str
    rc_status: str
    puc_valid_upto: Optional[str] = None
    vehicle_class: Optional[str] = None
    insurance_upto: Optional[str] = None
    maker_model: Optional[str] = None
    raw_response: Dict[str, Any] = Field(default_factory=dict)


class ComplianceDecision(BaseModel):
    movement_id: str
    vehicle_number: str
    owner_name: Optional[str] = "UNKNOWN"
    vendor_code: str
    vendor_name: Optional[str] = None
    rc_status: str
    puc_valid_until: Optional[str] = None
    puc_status: Literal["VALID", "EXPIRED", "NOT_AVAILABLE"]
    compliance_status: Literal["ALLOWED", "DENIED", "OVERRIDDEN"]
    rejection_reasons: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    guard_id: str
    gate_id: str
    movement_type: Literal["ENTRY", "EXIT"] = "ENTRY"
    vehicle_class: Optional[str] = None
    insurance_upto: Optional[str] = None
    raw_surepass_payload: Dict[str, Any] = Field(default_factory=dict)


class GuardOverrideRequest(BaseModel):
    movement_id: str = Field(..., description="UUID of the denied gate movement record")
    guard_id: str = Field(..., description="Guard submitting the manual override")
    supervisor_code: str = Field(..., description="Supervisor authorization PIN/code")
    override_reason: str = Field(..., min_length=5, description="Mandatory reason justifying plant entry override")


class GuardOverrideResponse(BaseModel):
    movement_id: str
    previous_status: str = "DENIED"
    new_status: str = "OVERRIDDEN"
    guard_id: str
    supervisor_code: str
    override_reason: str
    overridden_at: datetime
    message: str = "Gate movement successfully overridden and authorized."


class VendorSchema(BaseModel):
    id: str
    vendor_code: str
    vendor_name: str
    is_active: bool
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    created_at: Optional[datetime] = None


class MovementLogItem(BaseModel):
    id: str
    gate_id: str
    movement_type: str
    vehicle_number: str
    ocr_confidence: Optional[float] = None
    owner_name: Optional[str] = None
    vendor_id: Optional[str] = None
    vendor_code: Optional[str] = None
    vendor_name: Optional[str] = None
    rc_status: Optional[str] = None
    puc_valid_until: Optional[str] = None
    compliance_status: str
    rejection_reasons: List[str] = Field(default_factory=list)
    guard_id: str
    override_reason: Optional[str] = None
    supervisor_code: Optional[str] = None
    overridden_at: Optional[datetime] = None
    created_at: datetime


class BatchTestcaseItem(BaseModel):
    vehicle_number: str = Field(..., description="Vehicle registration plate number")
    vendor_code: str = Field("VEND-TATALOG-01", description="Associated logistics vendor code")
    scenario: Optional[str] = Field(None, description="Optional override scenario: ALLOWED, EXPIRED_PUC, SUSPENDED_RC, INACTIVE, NOT_FOUND")
    movement_type: str = Field("ENTRY", description="ENTRY or EXIT")
    ocr_confidence: Optional[float] = Field(97.5, description="Simulated OCR confidence score")


class BatchTestRequest(BaseModel):
    guard_id: str = Field("GUARD-8812", description="Guard station identifier")
    gate_id: str = Field("GATE-NORTH-01", description="Gate entry point identifier")
    testcases: Optional[List[BatchTestcaseItem]] = Field(None, description="Optional custom list of testcases; if omitted, runs all 8 predefined edge scenarios")


# ------------------------------------------------------------------------------
# RBAC & Authentication Schemas
# ------------------------------------------------------------------------------
class UserProfileSchema(BaseModel):
    id: str
    employee_id: str
    full_name: str
    role: str = Field(..., description="Role: GATE_GUARD, PLANT_SUPERVISOR, or ADMIN")
    assigned_gate_id: Optional[str] = "GATE-NORTH-01"
    is_active: bool = True
    created_at: Optional[datetime] = None


class LoginRequest(BaseModel):
    login_type: str = Field("GUARD_QUICK_SHIFT", description="GUARD_QUICK_SHIFT or SUPERVISOR_CREDENTIALS")
    employee_id: str = Field(..., description="Employee / Officer ID or Email")
    password_or_pin: str = Field(..., description="Guard shift PIN or Supervisor master code")
    assigned_gate_id: Optional[str] = Field("GATE-NORTH-01", description="Physical gate terminal assignment")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileSchema
    permissions: List[str] = Field(default_factory=list)
    message: str = "Login successful"

