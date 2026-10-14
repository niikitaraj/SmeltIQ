import logging
import uuid
from datetime import datetime, date
from typing import List, Tuple, Optional
from app.config import settings
from app.schemas import (
    ComplianceVerifyRequest,
    ComplianceDecision,
    SurepassParsedData,
    GuardOverrideRequest,
    GuardOverrideResponse
)
from app.database import db_manager
from app.services.surepass_service import surepass_service

logger = logging.getLogger("smeltiq.compliance")


class ComplianceEngine:
    def __init__(self):
        logger.info("Compliance Rule Matrix Engine initialized.")

    async def verify_vehicle_entry(self, req: ComplianceVerifyRequest) -> ComplianceDecision:
        """
        Orchestrate Surepass lookup, execute 3-Rule Matrix, and persist audit record to Supabase.
        """
        vehicle_num = req.vehicle_number
        logger.info("Verifying statutory entry compliance for vehicle %s at %s", vehicle_num, req.gate_id)

        # 1. Fetch live or mock Surepass RC details (with optional test scenario override)
        rc_data: SurepassParsedData = await surepass_service.fetch_rc_details(
            vehicle_num,
            scenario_override=req.simulate_scenario
        )

        # 2. Fetch Vendor record from Database / Supabase
        vendor = await db_manager.get_vendor_by_code(req.expected_vendor_code)

        # 3. Execute Rule Matrix
        rejection_reasons: List[str] = []
        puc_status_str = "NOT_AVAILABLE"

        # Rule 1: RC Status Check
        if not rc_data.rc_status or rc_data.rc_status.upper() != "ACTIVE":
            rejection_reasons.append(
                f"Statutory RC Violation: Vehicle Registration status is '{rc_data.rc_status}' (Mandatory: ACTIVE)"
            )

        # Rule 2: PUC Validity Check (must be >= today)
        today = date.today()
        puc_date_obj: Optional[date] = None

        if rc_data.puc_valid_upto:
            try:
                # Handle YYYY-MM-DD or ISO string
                clean_puc_str = rc_data.puc_valid_upto.split("T")[0]
                puc_date_obj = date.fromisoformat(clean_puc_str)
                if puc_date_obj >= today:
                    puc_status_str = "VALID"
                else:
                    puc_status_str = "EXPIRED"
                    rejection_reasons.append(
                        f"Environmental Compliance Violation: Pollution Under Control (PUC) certificate expired on {puc_date_obj.isoformat()} (Validity < Current Date)"
                    )
            except Exception as d_err:
                logger.warning("Error parsing PUC date string '%s': %s", rc_data.puc_valid_upto, d_err)
                puc_status_str = "NOT_AVAILABLE"
                rejection_reasons.append(
                    f"Statutory PUC Failure: Unable to verify certificate validity format ('{rc_data.puc_valid_upto}')"
                )
        else:
            puc_status_str = "NOT_AVAILABLE"
            rejection_reasons.append(
                "Environmental Compliance Violation: No active PUC certificate on file with RTO database"
            )

        # Rule 3: Vendor Match & Active Status
        vendor_id = None
        vendor_name = None
        if not vendor:
            rejection_reasons.append(
                f"Access Authorization Violation: Expected Vendor Code '{req.expected_vendor_code}' is not recognized in plant procurement records"
            )
        else:
            vendor_id = vendor.get("id")
            vendor_name = vendor.get("vendor_name")
            if not vendor.get("is_active"):
                rejection_reasons.append(
                    f"Gate Security Violation: Associated logistics vendor '{vendor_name}' ({req.expected_vendor_code}) is SUSPENDED / INACTIVE"
                )

        # Determine Final Compliance Status
        if len(rejection_reasons) == 0:
            compliance_status = "ALLOWED"
        else:
            compliance_status = "DENIED"

        # 4. Prepare Movement Audit Record for Database Persistence
        movement_id = str(uuid.uuid4())
        created_at_dt = datetime.utcnow()

        movement_record = {
            "id": movement_id,
            "gate_id": req.gate_id,
            "movement_type": req.movement_type,
            "vehicle_number": vehicle_num,
            "ocr_confidence": req.ocr_confidence or 92.5,
            "owner_name": rc_data.owner_name,
            "vendor_id": vendor_id,
            "vendor_code": req.expected_vendor_code,
            "vendor_name": vendor_name,
            "rc_status": rc_data.rc_status,
            "puc_valid_until": puc_date_obj.isoformat() if puc_date_obj else None,
            "compliance_status": compliance_status,
            "rejection_reasons": rejection_reasons,
            "raw_surepass_payload": rc_data.raw_response,
            "guard_id": req.guard_id,
            "created_at": created_at_dt.isoformat()
        }

        # Save to Supabase
        await db_manager.create_gate_movement(movement_record)

        return ComplianceDecision(
            movement_id=movement_id,
            vehicle_number=vehicle_num,
            owner_name=rc_data.owner_name,
            vendor_code=req.expected_vendor_code,
            vendor_name=vendor_name,
            rc_status=rc_data.rc_status,
            puc_valid_until=puc_date_obj.isoformat() if puc_date_obj else None,
            puc_status=puc_status_str,
            compliance_status=compliance_status,
            rejection_reasons=rejection_reasons,
            timestamp=created_at_dt,
            guard_id=req.guard_id,
            gate_id=req.gate_id,
            movement_type=req.movement_type,
            vehicle_class=rc_data.vehicle_class,
            insurance_upto=rc_data.insurance_upto,
            raw_surepass_payload=rc_data.raw_response
        )

    async def override_movement(self, req: GuardOverrideRequest) -> GuardOverrideResponse:
        """
        Validate supervisor PIN/code and record manual guard override into database.
        """
        # Validate supervisor code (e.g. SUPER88 or prefix SUP-)
        valid_pin = settings.SUPERVISOR_OVERRIDE_PIN.upper()
        entered_code = req.supervisor_code.strip().upper()
        
        # Accept default pin or standard supervisor formats
        if entered_code != valid_pin and not entered_code.startswith("SUP-"):
            raise ValueError(
                f"Invalid supervisor authorization code '{req.supervisor_code}'. Use standard authorization code or '{settings.SUPERVISOR_OVERRIDE_PIN}'."
            )

        if not req.override_reason or len(req.override_reason.strip()) < 5:
            raise ValueError("A detailed mandatory justification reason (min 5 characters) is required for safety compliance overrides.")

        updated = await db_manager.override_gate_movement(
            movement_id=req.movement_id,
            guard_id=req.guard_id,
            supervisor_code=entered_code,
            override_reason=req.override_reason.strip()
        )

        if not updated:
            raise ValueError(f"Movement ID {req.movement_id} not found in gate movement records.")

        return GuardOverrideResponse(
            movement_id=req.movement_id,
            previous_status="DENIED",
            new_status="OVERRIDDEN",
            guard_id=req.guard_id,
            supervisor_code=entered_code,
            override_reason=req.override_reason.strip(),
            overridden_at=datetime.utcnow()
        )


compliance_engine = ComplianceEngine()
