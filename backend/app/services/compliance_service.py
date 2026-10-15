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


def parse_date_safely(date_val: Optional[str]) -> Optional[date]:
    """Parse various date formats returned by RTO/Surepass APIs."""
    if not date_val:
        return None
    date_str = str(date_val).strip().split("T")[0]
    try:
        return date.fromisoformat(date_str)
    except Exception:
        pass
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%b-%Y", "%d-%B-%Y", "%b %d, %Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except Exception:
            continue
    return None


class ComplianceEngine:
    def __init__(self):
        logger.info("Compliance Rule Matrix Engine initialized.")

    async def verify_vehicle_entry(self, req: ComplianceVerifyRequest) -> ComplianceDecision:
        """
        Cache-First Statutory Verification Workflow:
        1. Query Supabase PostgreSQL (table: gate_movements) for cached vehicle registration.
        2. If cached and not force_refresh, extract saved statutory details (0 external API cost).
        3. If cache miss or force_refresh=True, execute HTTP request to Surepass RC-v2 API.
        4. Evaluate 3-Rule Statutory Compliance Matrix (Active RC, Valid PUC, Authorized Vendor).
        5. Persist gate movement audit record and raw payload into Supabase for future requests.
        """
        clean_plate = "".join(ch for ch in req.vehicle_number.upper() if ch.isalnum())
        force_refresh = getattr(req, "force_refresh", False) or False
        logger.info(
            "Starting compliance verification for vehicle %s at %s (force_refresh=%s)",
            clean_plate, req.gate_id, force_refresh
        )

        rc_data: Optional[SurepassParsedData] = None
        is_from_cache = False
        data_source = "SUREPASS_SANDBOX"

        # ----------------------------------------------------------------------
        # Step 1: Check Supabase Database First (Cache-First Layer)
        # ----------------------------------------------------------------------
        if not req.simulate_scenario and not force_refresh:
            cached_record = await db_manager.get_cached_vehicle_data(clean_plate, force_refresh=False)
            if cached_record:
                is_from_cache = True
                data_source = "SUPABASE_CACHE"
                logger.info(
                    "CACHE-FIRST HIT: Found statutory record in Supabase for %s (0 API Cost)",
                    clean_plate
                )
                raw_payload = cached_record.get("raw_surepass_payload") or {}
                owner_name = cached_record.get("owner_name")
                rc_status = cached_record.get("rc_status") or "ACTIVE"
                puc_valid_until = cached_record.get("puc_valid_until")
                vehicle_class = cached_record.get("vehicle_class")
                insurance_upto = cached_record.get("insurance_valid_until")
                permit_number = cached_record.get("permit_number")
                permit_type = cached_record.get("permit_type")
                permit_valid_upto = cached_record.get("permit_valid_until")
                national_permit_number = cached_record.get("national_permit_number")
                national_permit_upto = cached_record.get("national_permit_upto")
                national_permit_issued_by = cached_record.get("national_permit_issued_by")
                maker_model = None

                if isinstance(raw_payload, dict):
                    inner = raw_payload.get("data", {})
                    if not owner_name or owner_name == "UNKNOWN":
                        owner_name = inner.get("owner_name") or inner.get("owner_name_cleaned")
                    if not puc_valid_until:
                        puc_valid_until = (
                            inner.get("pucc_upto")
                            or inner.get("puc_valid_upto")
                            or inner.get("pucc_valid_upto")
                        )
                    if not vehicle_class:
                        vehicle_class = (
                            inner.get("vehicle_category_description")
                            or inner.get("vehicle_category")
                            or inner.get("vehicle_class")
                        )
                    if not insurance_upto:
                        insurance_upto = inner.get("insurance_upto") or inner.get("insurance_validity")
                    if not permit_number:
                        permit_number = inner.get("permit_number") or inner.get("permit_no")
                        if permit_number and str(permit_number).strip() in ("0", "", "None", "null"):
                            permit_number = None
                    if not permit_type:
                        permit_type = inner.get("permit_type")
                    if not permit_valid_upto:
                        permit_valid_upto = inner.get("permit_valid_upto") or inner.get("permit_upto")
                    if not national_permit_number:
                        national_permit_number = inner.get("national_permit_number") or inner.get("np_number")
                        if national_permit_number and str(national_permit_number).strip() in ("0", "", "None", "null"):
                            national_permit_number = None
                    if not national_permit_upto:
                        national_permit_upto = inner.get("national_permit_upto") or inner.get("np_upto")
                    if not national_permit_issued_by:
                        national_permit_issued_by = inner.get("national_permit_issued_by") or inner.get("np_issued_by")
                    maker_model = inner.get("maker_model") or inner.get("model")

                rc_data = SurepassParsedData(
                    rc_number=clean_plate,
                    owner_name=(owner_name or "UNKNOWN OWNER").strip().upper(),
                    rc_status=rc_status.strip().upper(),
                    puc_valid_upto=str(puc_valid_until) if puc_valid_until else None,
                    vehicle_class=vehicle_class or "Heavy Goods Vehicle",
                    insurance_upto=str(insurance_upto) if insurance_upto else None,
                    maker_model=maker_model,
                    permit_number=str(permit_number).strip() if permit_number else None,
                    permit_type=str(permit_type).strip() if permit_type else None,
                    permit_valid_upto=str(permit_valid_upto).strip() if permit_valid_upto else None,
                    national_permit_number=str(national_permit_number).strip() if national_permit_number else None,
                    national_permit_upto=str(national_permit_upto).strip() if national_permit_upto else None,
                    national_permit_issued_by=str(national_permit_issued_by).strip() if national_permit_issued_by else None,
                    raw_response=raw_payload
                )

        # ----------------------------------------------------------------------
        # Step 2: Cache Miss or Force Refresh -> Call Surepass Sandbox API (/rc/rc-v2)
        # ----------------------------------------------------------------------
        if rc_data is None:
            logger.info(
                "CACHE MISS or LIVE REQUEST: Vehicle %s calling Surepass RC-v2 API at %s...",
                clean_plate, surepass_service.api_url
            )
            rc_data = await surepass_service.fetch_rc_details(
                clean_plate,
                scenario_override=req.simulate_scenario
            )
            is_from_cache = False
            data_source = "SUREPASS_MOCK" if surepass_service.is_mock else "SUREPASS_SANDBOX"

        # ----------------------------------------------------------------------
        # Step 3: Fetch Transporter / Vendor record from Database
        # ----------------------------------------------------------------------
        vendor = await db_manager.get_vendor_by_code(req.expected_vendor_code)

        # ----------------------------------------------------------------------
        # Step 4: Execute 3-Rule Statutory Compliance Matrix
        # ----------------------------------------------------------------------
        rejection_reasons: List[str] = []
        puc_status_str = "NOT_AVAILABLE"

        # Rule 1: RC Status Check
        if not rc_data.rc_status or rc_data.rc_status.upper() != "ACTIVE":
            if rc_data.rc_status == "NOT_FOUND":
                rejection_reasons.append(
                    f"Statutory RC Violation: Vehicle registration '{clean_plate}' not found in Ministry of Road Transport (MoRTH) / Vahan database"
                )
            elif rc_data.rc_status == "INVALID":
                rejection_reasons.append(
                    f"Vehicle Identification Violation: Registration number '{clean_plate}' failed RTO plate syntax validation"
                )
            elif rc_data.rc_status == "API_AUTH_ERROR":
                rejection_reasons.append(
                    "Statutory Verification Error: Surepass API Token Unauthorized (401). Verify SUREPASS_SANDBOX_TOKEN in backend environment."
                )
            elif rc_data.rc_status == "RATE_LIMITED":
                rejection_reasons.append(
                    "Statutory Verification Error: Surepass API Rate Limit Exceeded or Sandbox Credits Exhausted (429)."
                )
            elif rc_data.rc_status == "GATEWAY_UNAVAILABLE":
                rejection_reasons.append(
                    "Statutory Verification Error: Upstream National RTO Gateway or Surepass API is temporarily unavailable."
                )
            else:
                rejection_reasons.append(
                    f"Statutory RC Violation: Vehicle Registration status is '{rc_data.rc_status}' (Mandatory: ACTIVE)"
                )

        # Rule 2: PUC Validity Check (must be >= today)
        today = date.today()
        puc_date_obj: Optional[date] = parse_date_safely(rc_data.puc_valid_upto)

        if puc_date_obj:
            if puc_date_obj >= today:
                puc_status_str = "VALID"
            else:
                puc_status_str = "EXPIRED"
                rejection_reasons.append(
                    f"Environmental Compliance Violation: Pollution Under Control (PUC) certificate expired on {puc_date_obj.isoformat()} (Validity < Current Date)"
                )
        elif rc_data.rc_status not in ("NOT_FOUND", "INVALID", "API_AUTH_ERROR", "RATE_LIMITED", "GATEWAY_UNAVAILABLE"):
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

        # Rule 4: Statutory Transport Permit Validation (Local & National Permits)
        v_class_lower = (rc_data.vehicle_class or "").lower()
        is_non_commercial = any(
            nc in v_class_lower for nc in [
                "2wn", "2-wheeler", "m-cycle", "scooter", "motorcycle",
                "motor car", "private", "personal", "passenger car"
            ]
        )

        permit_date_obj: Optional[date] = parse_date_safely(rc_data.permit_valid_upto)
        np_date_obj: Optional[date] = parse_date_safely(rc_data.national_permit_upto)

        permit_status_str = "NOT_AVAILABLE"
        effective_permit_date: Optional[date] = None

        if is_non_commercial:
            permit_status_str = "NOT_APPLICABLE"
        else:
            # Check National Permit validity first, then Local Permit validity
            has_valid_permit = False
            if np_date_obj and np_date_obj >= today:
                has_valid_permit = True
                effective_permit_date = np_date_obj
            elif permit_date_obj and permit_date_obj >= today:
                has_valid_permit = True
                effective_permit_date = permit_date_obj
            elif np_date_obj:
                effective_permit_date = np_date_obj
            elif permit_date_obj:
                effective_permit_date = permit_date_obj

            if has_valid_permit:
                permit_status_str = "VALID"
            elif effective_permit_date and effective_permit_date < today:
                permit_status_str = "EXPIRED"
                permit_desc = rc_data.permit_type or "Goods Transport Permit"
                permit_ref = rc_data.national_permit_number or rc_data.permit_number or "N/A"
                rejection_reasons.append(
                    f"Transport Permit Violation: Statutory Commercial Permit ({permit_desc}, No: {permit_ref}) expired on {effective_permit_date.isoformat()} (Validity < Current Date)"
                )
            elif rc_data.rc_status not in ("NOT_FOUND", "INVALID", "API_AUTH_ERROR", "RATE_LIMITED", "GATEWAY_UNAVAILABLE"):
                permit_status_str = "NOT_AVAILABLE"
                rejection_reasons.append(
                    "Transport Permit Violation: No statutory Transport Permit (Local or National) registered with RTO for commercial freight vehicle"
                )

        # Determine Final Compliance Status
        if len(rejection_reasons) == 0:
            compliance_status = "ALLOWED"
        else:
            compliance_status = "DENIED"

        # ----------------------------------------------------------------------
        # Step 5: Prepare & Persist Movement Record to Supabase
        # ----------------------------------------------------------------------
        movement_id = str(uuid.uuid4())
        created_at_dt = datetime.utcnow()

        movement_record = {
            "id": movement_id,
            "gate_id": req.gate_id,
            "movement_type": req.movement_type,
            "vehicle_number": clean_plate,
            "ocr_confidence": req.ocr_confidence or 92.5,
            "owner_name": rc_data.owner_name,
            "vendor_id": vendor_id,
            "vendor_code": req.expected_vendor_code,
            "vendor_name": vendor_name,
            "rc_status": rc_data.rc_status,
            "puc_valid_until": puc_date_obj.isoformat() if puc_date_obj else None,
            "insurance_valid_until": rc_data.insurance_upto,
            "vehicle_class": rc_data.vehicle_class,
            "permit_number": rc_data.permit_number,
            "permit_type": rc_data.permit_type,
            "permit_valid_until": effective_permit_date.isoformat() if effective_permit_date else (permit_date_obj.isoformat() if permit_date_obj else None),
            "permit_status": permit_status_str,
            "national_permit_number": rc_data.national_permit_number,
            "national_permit_upto": np_date_obj.isoformat() if np_date_obj else None,
            "national_permit_issued_by": rc_data.national_permit_issued_by,
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
            vehicle_number=clean_plate,
            owner_name=rc_data.owner_name,
            vendor_code=req.expected_vendor_code,
            vendor_name=vendor_name,
            rc_status=rc_data.rc_status,
            puc_valid_until=puc_date_obj.isoformat() if puc_date_obj else None,
            puc_status=puc_status_str,
            permit_number=rc_data.permit_number,
            permit_type=rc_data.permit_type,
            permit_valid_until=effective_permit_date.isoformat() if effective_permit_date else (permit_date_obj.isoformat() if permit_date_obj else None),
            permit_status=permit_status_str,
            national_permit_number=rc_data.national_permit_number,
            national_permit_upto=np_date_obj.isoformat() if np_date_obj else None,
            compliance_status=compliance_status,
            rejection_reasons=rejection_reasons,
            timestamp=created_at_dt,
            guard_id=req.guard_id,
            gate_id=req.gate_id,
            movement_type=req.movement_type,
            vehicle_class=rc_data.vehicle_class,
            insurance_upto=rc_data.insurance_upto,
            raw_surepass_payload=rc_data.raw_response,
            is_cached=is_from_cache,
            data_source=data_source
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
