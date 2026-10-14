import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from app.schemas import (
    ComplianceVerifyRequest,
    ComplianceDecision,
    GuardOverrideRequest,
    GuardOverrideResponse,
    MovementLogItem,
    BatchTestRequest,
    BatchTestcaseItem
)
from app.services.compliance_service import compliance_engine
from app.database import db_manager

logger = logging.getLogger("smeltiq.router.gate")
router = APIRouter(prefix="/gate", tags=["Gate Access & Statutory Compliance"])

# Catalog of Pre-Configured Multiple Dummy Testcases
PRESET_TESTCASES = [
    {
        "id": "tc-01",
        "title": "Compliant Heavy Carrier (Tata Logistics)",
        "vehicle_number": "AP31TJ9988",
        "vendor_code": "VEND-TATALOG-01",
        "expected_status": "ALLOWED",
        "category": "Happy Path",
        "scenario": "ALLOWED",
        "description": "Active RC, PUC valid (+120 days), fully authorized transporter."
    },
    {
        "id": "tc-02",
        "title": "Expired PUC Certificate (Jindal Trans)",
        "vehicle_number": "MH12AB5678",
        "vendor_code": "VEND-JINDAL-02",
        "expected_status": "DENIED",
        "category": "Statutory Violation",
        "scenario": "EXPIRED_PUC",
        "description": "Active RC, but Pollution Under Control (PUC) certificate expired 22 days ago."
    },
    {
        "id": "tc-03",
        "title": "Suspended RC (RTO Impounded / Vizag Coastal)",
        "vehicle_number": "AP31XX0001",
        "vendor_code": "VEND-VIZAG-03",
        "expected_status": "DENIED",
        "category": "RC Violation",
        "scenario": "SUSPENDED_RC",
        "description": "RC status is SUSPENDED by RTO. Eligible to test Guard Supervisor Override."
    },
    {
        "id": "tc-04",
        "title": "Blacklisted Logistics Transporter",
        "vehicle_number": "AP31TJ9988",
        "vendor_code": "VEND-BLACKLIST-99",
        "expected_status": "DENIED",
        "category": "Vendor Security",
        "scenario": "ALLOWED",
        "description": "Vehicle is active, but transporter 'Defunct Southern Roadways' is blacklisted in plant records."
    },
    {
        "id": "tc-05",
        "title": "Compounded Triple Violation (NCR Bulk)",
        "vehicle_number": "DL01AB1234",
        "vendor_code": "VEND-BLACKLIST-99",
        "expected_status": "DENIED",
        "category": "Compounding Violation",
        "scenario": "INACTIVE",
        "description": "Vehicle RC Inactive + PUC Expired 90 days ago + Transporter Blacklisted."
    },
    {
        "id": "tc-06",
        "title": "Unregistered / Stolen RTO Record (Not Found)",
        "vehicle_number": "OD02NF0000",
        "vendor_code": "VEND-APEX-04",
        "expected_status": "DENIED",
        "category": "RTO Missing",
        "scenario": "NOT_FOUND",
        "description": "Vehicle registration not found on central Vahan / RTO database."
    },
    {
        "id": "tc-07",
        "title": "Compliant Coastal Slag Carrier (Vizag Coastal)",
        "vehicle_number": "AP31CG7744",
        "vendor_code": "VEND-VIZAG-03",
        "expected_status": "ALLOWED",
        "category": "Happy Path",
        "scenario": "ALLOWED",
        "description": "Slag tipper with valid PUC (+90 days), active RC, and authorized transporter."
    },
    {
        "id": "tc-08",
        "title": "Compliant Ore & Minerals Hauler (Apex Ore)",
        "vehicle_number": "AP31AP8821",
        "vendor_code": "VEND-APEX-04",
        "expected_status": "ALLOWED",
        "category": "Happy Path",
        "scenario": "ALLOWED",
        "description": "High-axle dumper with active RC, valid PUC (+150 days), and approved contract."
    }
]


@router.get("/testcases", summary="List available dummy testcase scenarios")
async def list_testcases():
    """Returns the catalog of multi-scenario dummy testcases for instant testing."""
    return PRESET_TESTCASES


@router.post("/verify", response_model=ComplianceDecision, summary="Verify vehicle statutory compliance & gate entry")
async def verify_gate_entry(request: ComplianceVerifyRequest):
    """
    Core Entry Compliance Verification:
    1. Fetches statutory RC & PUC data via Surepass Sandbox API (or dummy engine)
    2. Runs 3-Rule Compliance Matrix (Active RC, PUC >= Today, Active Vendor)
    3. Saves full audit log and raw JSON payload to Supabase gate_movements
    4. Returns ALLOWED or DENIED with itemized grounds
    """
    try:
        decision = await compliance_engine.verify_vehicle_entry(request)
        return decision
    except Exception as e:
        logger.error("Compliance verification failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Compliance evaluation failed: {str(e)}")


@router.post("/batch-test", response_model=List[ComplianceDecision], summary="Execute multiple dummy testcases in real-time")
async def run_batch_test(
    payload: Optional[BatchTestRequest] = None,
    guard_id: Optional[str] = Query("GUARD-8812"),
    gate_id: Optional[str] = Query("GATE-NORTH-01")
):
    """
    Executes multiple dummy testcases through the compliance rule engine in real-time.
    Accepts either an optional custom list of testcases in the request body, or defaults
    to running all 8 predefined factory edge cases.
    Logs every decision, raw Surepass payload, and statutory violation into Supabase.
    """
    results: List[ComplianceDecision] = []
    
    # Determine effective guard/gate IDs
    effective_guard_id = (payload.guard_id if payload and payload.guard_id else guard_id) or "GUARD-8812"
    effective_gate_id = (payload.gate_id if payload and payload.gate_id else gate_id) or "GATE-NORTH-01"
    
    # Determine test cases: custom or predefined
    cases_to_run = []
    if payload and payload.testcases and len(payload.testcases) > 0:
        for tc in payload.testcases:
            cases_to_run.append({
                "vehicle_number": tc.vehicle_number,
                "vendor_code": tc.vendor_code,
                "scenario": tc.scenario,
                "movement_type": tc.movement_type,
                "ocr_confidence": tc.ocr_confidence or 97.5
            })
    else:
        for tc in PRESET_TESTCASES:
            cases_to_run.append({
                "vehicle_number": tc["vehicle_number"],
                "vendor_code": tc["vendor_code"],
                "scenario": tc.get("scenario"),
                "movement_type": "ENTRY",
                "ocr_confidence": 97.5
            })
            
    try:
        for item in cases_to_run:
            req = ComplianceVerifyRequest(
                vehicle_number=item["vehicle_number"],
                expected_vendor_code=item["vendor_code"],
                guard_id=effective_guard_id,
                gate_id=effective_gate_id,
                movement_type=item.get("movement_type", "ENTRY"),
                ocr_confidence=item.get("ocr_confidence", 97.5),
                simulate_scenario=item.get("scenario")
            )
            decision = await compliance_engine.verify_vehicle_entry(req)
            results.append(decision)
        return results
    except Exception as e:
        logger.error("Batch test execution failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Batch test simulation failed: {str(e)}")


@router.post("/override", response_model=GuardOverrideResponse, summary="Guard manual override for denied vehicle")
async def override_gate_decision(request: GuardOverrideRequest):
    """
    Allows authorized guard to override a DENIED entry status after entering
    a valid supervisor PIN/code and mandatory justification text.
    """
    try:
        response = await compliance_engine.override_movement(request)
        return response
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.error("Gate override failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Override operation failed: {str(e)}")


@router.get("/movements", response_model=List[MovementLogItem], summary="Get recent gate movement audit records")
async def get_recent_gate_movements(limit: int = Query(30, ge=1, le=100)):
    """
    Retrieve real-time audit trail of entry and exit movements from Supabase.
    """
    try:
        records = await db_manager.get_recent_movements(limit=limit)
        return records
    except Exception as e:
        logger.error("Failed fetching movement records: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch audit log.")
