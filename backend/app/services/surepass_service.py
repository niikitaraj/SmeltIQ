import logging
from datetime import date, timedelta
from typing import Dict, Any, Optional
import httpx
from fastapi import HTTPException
from app.config import settings
from app.schemas import SurepassParsedData

logger = logging.getLogger("smeltiq.surepass")


class SurepassService:
    def __init__(self):
        logger.info(
            "Surepass Service initialized. Target URL: %s, Mock Mode: %s",
            settings.get_surepass_rc_url(),
            settings.is_surepass_mock_active()
        )

    @property
    def api_url(self) -> str:
        return settings.get_surepass_rc_url()

    @property
    def api_token(self) -> str:
        return settings.get_surepass_token()

    @property
    def is_mock(self) -> bool:
        return settings.is_surepass_mock_active()

    async def fetch_rc_details(
        self,
        vehicle_number: str,
        scenario_override: Optional[str] = None
    ) -> SurepassParsedData:
        """
        Query live Surepass Vehicle RC API (https://api.surepass.io/api/v1/rc/rc-full or sandbox)
        or return simulated response ONLY if explicitly in mock mode.
        If the Surepass API call fails, raises an explicit HTTPException.
        """
        clean_plate = "".join(ch for ch in vehicle_number.upper() if ch.isalnum())

        # Mock mode is only active if SUREPASS_MOCK=true or explicit scenario_override in automated tests
        if scenario_override or self.is_mock:
            logger.info("Using mock/simulated Surepass response for plate: %s (scenario=%s)", clean_plate, scenario_override)
            return self._get_mock_response(clean_plate, scenario=scenario_override)

        # Real Live API call to Surepass
        url = self.api_url
        token = self.api_token
        if not token or token.strip() == "":
            raise HTTPException(
                status_code=401,
                detail="Surepass API Token is not configured. Please set SUREPASS_API_KEY in /backend/.env."
            )

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = {
            "id_number": clean_plate
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                logger.info("Executing Direct Live Surepass API Request to: %s for vehicle: %s", url, clean_plate)
                resp = await client.post(url, json=payload, headers=headers)
                
                try:
                    raw_data = resp.json()
                except Exception:
                    raw_data = {"status_code": resp.status_code, "text": resp.text}

                logger.info("Surepass API returned HTTP %s for vehicle %s", resp.status_code, clean_plate)

                # HTTP 200: Successful lookup or business response
                if resp.status_code == 200:
                    if isinstance(raw_data, dict):
                        is_success = raw_data.get("success", False)
                        has_data = bool(raw_data.get("data"))
                        if is_success and has_data:
                            return self._parse_surepass_response(clean_plate, raw_data)
                        elif not is_success:
                            msg = raw_data.get("message") or "Vehicle record not found"
                            # If message indicates record not found in RTO registry
                            if "not found" in msg.lower() or raw_data.get("status_code") == 404:
                                logger.warning("Vehicle %s not found in RTO registry: %s", clean_plate, msg)
                                return SurepassParsedData(
                                    rc_number=clean_plate,
                                    owner_name="RECORD NOT FOUND",
                                    rc_status="NOT_FOUND",
                                    puc_valid_upto=None,
                                    vehicle_class=None,
                                    insurance_upto=None,
                                    maker_model=None,
                                    raw_response=raw_data
                                )
                            raise HTTPException(
                                status_code=400,
                                detail=f"Surepass API Error (HTTP 200 with success=false): {msg}"
                            )
                    return self._parse_surepass_response(clean_plate, raw_data)

                # HTTP 404: Vehicle registration not found in Vahan / RTO database
                elif resp.status_code == 404:
                    logger.warning("Vehicle %s not found in Surepass/Vahan registry (HTTP 404)", clean_plate)
                    return SurepassParsedData(
                        rc_number=clean_plate,
                        owner_name="RECORD NOT FOUND",
                        rc_status="NOT_FOUND",
                        puc_valid_upto=None,
                        vehicle_class=None,
                        insurance_upto=None,
                        maker_model=None,
                        raw_response=raw_data
                    )

                # HTTP 401 / 403: Authentication or Permission Failure
                elif resp.status_code in (401, 403):
                    logger.error("Surepass API authorization failure (HTTP %s): %s", resp.status_code, raw_data)
                    raise HTTPException(
                        status_code=resp.status_code,
                        detail=f"Surepass API Authentication Failed (HTTP {resp.status_code}): Invalid or expired Bearer Token. Ensure SUREPASS_API_KEY in .env is valid. Response: {resp.text}"
                    )

                # HTTP 400 / 422: Malformed plate syntax or request validation failure
                elif resp.status_code in (400, 422):
                    msg = raw_data.get("message") if isinstance(raw_data, dict) else resp.text
                    logger.warning("Surepass rejected plate format for %s (HTTP %s): %s", clean_plate, resp.status_code, msg)
                    raise HTTPException(
                        status_code=resp.status_code,
                        detail=f"Surepass API Validation Error (HTTP {resp.status_code}): {msg}"
                    )

                # HTTP 429: Rate Limit / Credits Depleted
                elif resp.status_code == 429:
                    logger.error("Surepass API rate limit or credits depleted (HTTP 429)")
                    raise HTTPException(
                        status_code=429,
                        detail="Surepass API Rate Limit Exceeded or Account Credits Depleted (HTTP 429)."
                    )

                # HTTP 5xx: Upstream Server Error
                else:
                    logger.error("Surepass API returned unexpected HTTP %s: %s", resp.status_code, raw_data)
                    raise HTTPException(
                        status_code=502,
                        detail=f"Surepass Upstream RTO Gateway Error (HTTP {resp.status_code}): {resp.text}"
                    )

        except HTTPException:
            raise
        except Exception as e:
            logger.error("HTTP connection error calling Surepass at %s: %s", url, e)
            
            # If primary URL encountered connection failure, try candidate endpoints before raising
            fallback_candidates = [
                "https://sandbox.surepass.app/api/v1/rc/rc-v2",
                "https://sandbox.surepass.io/api/v1/rc/rc-v2",
                "https://sandbox.surepass.io/api/v1/rc/rc-full",
                "https://kyc.surepass.io/api/v1/rc/rc-v2"
            ]
            for fallback_url in fallback_candidates:
                if fallback_url != url:
                    try:
                        logger.info("Attempting alternate live Surepass endpoint: %s for %s", fallback_url, clean_plate)
                        async with httpx.AsyncClient(timeout=20.0) as client:
                            fb_resp = await client.post(fallback_url, json=payload, headers=headers)
                            if fb_resp.status_code == 200:
                                fb_data = fb_resp.json()
                                if isinstance(fb_data, dict) and fb_data.get("success") and fb_data.get("data"):
                                    return self._parse_surepass_response(clean_plate, fb_data)
                            elif fb_resp.status_code == 404:
                                return SurepassParsedData(
                                    rc_number=clean_plate,
                                    owner_name="RECORD NOT FOUND",
                                    rc_status="NOT_FOUND",
                                    puc_valid_upto=None,
                                    vehicle_class=None,
                                    insurance_upto=None,
                                    maker_model=None,
                                    raw_response=fb_resp.json() if fb_resp.text else {}
                                )
                            elif fb_resp.status_code in (401, 403):
                                raise HTTPException(
                                    status_code=fb_resp.status_code,
                                    detail=f"Surepass API Authentication Failed on {fallback_url} (HTTP {fb_resp.status_code}): {fb_resp.text}"
                                )
                    except HTTPException:
                        raise
                    except Exception as fb_err:
                        logger.warning("Alternate endpoint %s connection also failed: %s", fallback_url, fb_err)

            # All live attempts failed: Raise explicit HTTP 503 instead of returning dummy data
            raise HTTPException(
                status_code=503,
                detail=f"Surepass API Live Connection Error: Unable to reach {url} ({str(e)}). All dummy fallbacks have been eliminated."
            )

    def _parse_surepass_response(self, clean_plate: str, raw_payload: Dict[str, Any]) -> SurepassParsedData:
        data = raw_payload.get("data", {}) if isinstance(raw_payload, dict) else {}
        
        owner_name = (
            data.get("owner_name")
            or data.get("owner_name_cleaned")
            or data.get("owner")
            or "UNKNOWN OWNER"
        )
        rc_status = data.get("rc_status") or data.get("status") or "ACTIVE"
        
        # Surepass RC-v2 PUC field mappings
        puc_valid_upto = (
            data.get("pucc_upto")
            or data.get("puc_valid_upto")
            or data.get("pucc_valid_upto")
            or data.get("puc_upto")
        )
        
        vehicle_class = (
            data.get("vehicle_category_description")
            or data.get("vehicle_class")
            or data.get("vehicle_category")
            or "Heavy Goods Vehicle"
        )
        
        insurance_upto = (
            data.get("insurance_upto")
            or data.get("insurance_validity")
            or data.get("insurance_valid_upto")
        )
        
        maker_model = (
            data.get("maker_model")
            or data.get("maker_description")
            or data.get("model")
        )

        # Surepass RC-v2 Transport Permit field mappings (Local & National)
        permit_details = data.get("permit_details") if isinstance(data.get("permit_details"), dict) else {}

        permit_number = (
            data.get("permit_number")
            or data.get("permit_no")
            or permit_details.get("permit_number")
            or permit_details.get("permit_no")
        )
        if permit_number and str(permit_number).strip() in ("0", "", "None", "null"):
            permit_number = None

        permit_type = (
            data.get("permit_type")
            or permit_details.get("permit_type")
            or data.get("permit_category")
        )
        if permit_type and str(permit_type).strip() in ("", "None", "null"):
            permit_type = None

        permit_valid_upto = (
            data.get("permit_valid_upto")
            or data.get("permit_upto")
            or data.get("permit_validity")
            or permit_details.get("permit_valid_upto")
        )
        if permit_valid_upto and str(permit_valid_upto).strip() in ("", "None", "null"):
            permit_valid_upto = None

        permit_issue_date = (
            data.get("permit_issue_date")
            or data.get("permit_valid_from")
            or permit_details.get("permit_issue_date")
        )

        national_permit_number = (
            data.get("national_permit_number")
            or data.get("np_number")
            or data.get("national_permit_no")
            or permit_details.get("national_permit_number")
        )
        if national_permit_number and str(national_permit_number).strip() in ("0", "", "None", "null"):
            national_permit_number = None

        national_permit_upto = (
            data.get("national_permit_upto")
            or data.get("np_upto")
            or permit_details.get("national_permit_upto")
        )
        if national_permit_upto and str(national_permit_upto).strip() in ("", "None", "null"):
            national_permit_upto = None

        national_permit_issued_by = (
            data.get("national_permit_issued_by")
            or data.get("np_issued_by")
            or permit_details.get("national_permit_issued_by")
        )

        return SurepassParsedData(
            rc_number=clean_plate,
            owner_name=str(owner_name).strip().upper(),
            rc_status=str(rc_status).strip().upper(),
            puc_valid_upto=str(puc_valid_upto).strip() if puc_valid_upto else None,
            vehicle_class=str(vehicle_class).strip(),
            insurance_upto=str(insurance_upto).strip() if insurance_upto else None,
            maker_model=str(maker_model).strip() if maker_model else None,
            permit_number=str(permit_number).strip() if permit_number else None,
            permit_type=str(permit_type).strip() if permit_type else None,
            permit_valid_upto=str(permit_valid_upto).strip() if permit_valid_upto else None,
            permit_issue_date=str(permit_issue_date).strip() if permit_issue_date else None,
            national_permit_number=str(national_permit_number).strip() if national_permit_number else None,
            national_permit_upto=str(national_permit_upto).strip() if national_permit_upto else None,
            national_permit_issued_by=str(national_permit_issued_by).strip() if national_permit_issued_by else None,
            raw_response=raw_payload
        )

    def _get_mock_response(
        self,
        clean_plate: str,
        scenario: Optional[str] = None
    ) -> SurepassParsedData:
        """
        Deterministically returns realistic Surepass payloads for multiple dummy testcases.
        """
        today = date.today()

        # Check explicit scenario or plate identity
        is_puc_fail = scenario == "EXPIRED_PUC" or "PUC" in clean_plate or clean_plate == "MH12AB5678"
        is_rc_suspended = scenario == "SUSPENDED_RC" or "SUSP" in clean_plate or clean_plate == "AP31XX0001"
        is_permit_fail = scenario in ("EXPIRED_PERMIT", "PERMIT_EXPIRED", "NO_PERMIT") or "PERMIT" in clean_plate or clean_plate in ("AP31PM0000", "AP31EX9900")
        is_multi_fail = scenario == "INACTIVE" or "FAIL" in clean_plate or clean_plate == "DL01AB1234"
        is_not_found = scenario == "NOT_FOUND" or "NOTFOUND" in clean_plate or clean_plate == "OD02NF0000"
        is_blacklisted = scenario == "BLACKLISTED" or clean_plate == "KA05BL9999"

        # Real Test Case: MH34CC0820 (Omesh Tikaram Bansod - TVS Jupiter ZX)
        if clean_plate == "MH34CC0820":
            raw = {
                "status_code": 200,
                "success": True,
                "message": None,
                "message_code": "success",
                "data": {
                    "client_id": "rc_v2_fUqjkYdnlAxCpvrWUfei",
                    "rc_number": "MH34CC0820",
                    "fit_up_to": "2037-08-12",
                    "registration_date": "2022-08-13",
                    "owner_name": "Omesh Tikaram Bansod",
                    "father_name": "",
                    "present_address": "WARD NO. 07, NEAR DATTA MANDIR, AT.POST- TALODHI (BA), TAH- NAGBHID, Chandrapur, Maharashtra, 441221",
                    "permanent_address": "WARD NO. 07, NEAR DATTA MANDIR, AT.POST- TALODHI (BA), TAH- NAGBHID, Chandrapur, Maharashtra, 441221",
                    "mobile_number": "",
                    "vehicle_category": "2WN",
                    "vehicle_chasi_number": "MD626CG56N1G08709",
                    "vehicle_engine_number": "EG5GN1602092",
                    "maker_description": "TVS MOTOR COMPANY LTD",
                    "maker_model": "TVS JUPITER ZX INTELLIGO",
                    "body_type": "2 WHEELER",
                    "fuel_type": "PETROL",
                    "color": "C BRONZE",
                    "norms_type": "BHARAT STAGE VI",
                    "financer": "",
                    "financed": False,
                    "insurance_company": "GoDigit General Insurance Ltd.",
                    "insurance_policy_number": "D070264768",
                    "insurance_upto": "2027-07-18",
                    "manufacturing_date": "7/2022",
                    "manufacturing_date_formatted": "2022-07",
                    "registered_at": "RTO CHANDRAPUR, Maharashtra",
                    "latest_by": "2026-04-07",
                    "less_info": True,
                    "tax_upto": None,
                    "tax_paid_upto": "2037-08-12",
                    "cubic_capacity": "109.70",
                    "vehicle_gross_weight": "237",
                    "no_cylinders": "1",
                    "seat_capacity": "2",
                    "sleeper_capacity": "0",
                    "standing_capacity": "0",
                    "wheelbase": "1275",
                    "unladen_weight": "107",
                    "vehicle_category_description": "M-Cycle/Scooter(2WN)",
                    "pucc_number": "MH01200830056367",
                    "pucc_upto": "2026-07-03",
                    "permit_number": "0",
                    "permit_issue_date": None,
                    "permit_valid_from": None,
                    "permit_valid_upto": None,
                    "permit_type": "",
                    "national_permit_number": "",
                    "national_permit_upto": None,
                    "national_permit_issued_by": "",
                    "non_use_status": None,
                    "non_use_from": None,
                    "non_use_to": None,
                    "blacklist_status": "",
                    "noc_details": "",
                    "owner_number": "1",
                    "rc_status": "ACTIVE",
                    "rto_code": None
                }
            }
            return SurepassParsedData(
                rc_number="MH34CC0820",
                owner_name="OMESH TIKARAM BANSOD",
                rc_status="ACTIVE",
                puc_valid_upto="2026-07-03",
                vehicle_class="M-Cycle/Scooter(2WN)",
                insurance_upto="2027-07-18",
                maker_model="TVS JUPITER ZX INTELLIGO",
                raw_response=raw
            )

        if is_not_found:
            raw = {
                "status_code": 404,
                "success": False,
                "message": f"Vehicle registration '{clean_plate}' not found in Ministry of Road Transport (MoRTH) registry."
            }
            return SurepassParsedData(
                rc_number=clean_plate,
                owner_name="RECORD NOT FOUND",
                rc_status="NOT_FOUND",
                puc_valid_upto=None,
                vehicle_class="Unregistered",
                raw_response=raw
            )

        if is_blacklisted:
            raw = {
                "status_code": 200,
                "success": True,
                "data": {
                    "rc_number": clean_plate,
                    "rc_status": "CANCELLED",
                    "owner_name": "ILLEGAL FREIGHT RECOVERY",
                    "vehicle_class": "Heavy Transport Trailer",
                    "pucc_upto": (today - timedelta(days=120)).isoformat(),
                    "insurance_upto": (today - timedelta(days=60)).isoformat(),
                    "blacklisted": True,
                    "blacklisted_reason": "Court Order & Tax Default Enforcement"
                }
            }
            return SurepassParsedData(
                rc_number=clean_plate,
                owner_name="ILLEGAL FREIGHT RECOVERY",
                rc_status="CANCELLED",
                puc_valid_upto=(today - timedelta(days=120)).isoformat(),
                vehicle_class="Heavy Transport Trailer",
                raw_response=raw
            )

        if is_puc_fail:
            puc_expired = (today - timedelta(days=22)).isoformat()
            raw = {
                "status_code": 200,
                "success": True,
                "message": "RC details verified successfully",
                "data": {
                    "client_id": "smeltiq_poc_client_02",
                    "rc_number": clean_plate,
                    "rc_status": "ACTIVE",
                    "owner_name": "SURESH TRUCKING CO.",
                    "vehicle_category": "Multi-Axle Commercial Cargo",
                    "vehicle_class": "Commercial Freight Carrier",
                    "maker_model": "ASHOK LEYLAND 3520-8x2",
                    "pucc_upto": puc_expired,
                    "insurance_upto": (today + timedelta(days=90)).isoformat(),
                    "registered_at": "RTO PUNE (MH-12)"
                }
            }
            return SurepassParsedData(
                rc_number=clean_plate,
                owner_name="SURESH TRUCKING CO.",
                rc_status="ACTIVE",
                puc_valid_upto=puc_expired,
                vehicle_class="Commercial Freight Carrier",
                insurance_upto=(today + timedelta(days=90)).isoformat(),
                maker_model="ASHOK LEYLAND 3520-8x2",
                raw_response=raw
            )

        if is_rc_suspended:
            puc_date = (today + timedelta(days=45)).isoformat()
            raw = {
                "status_code": 200,
                "success": True,
                "message": "RC status flagged as SUSPENDED by RTO Authority",
                "data": {
                    "client_id": "smeltiq_poc_client_03",
                    "rc_number": clean_plate,
                    "rc_status": "SUSPENDED",
                    "owner_name": "VIJAYAWADA ROADWAYS LTD",
                    "vehicle_category": "Heavy Transport Trailer",
                    "vehicle_class": "Articulated Trailer",
                    "maker_model": "BHARATBENZ 5528TT",
                    "pucc_upto": puc_date,
                    "insurance_upto": (today + timedelta(days=50)).isoformat(),
                    "registered_at": "RTO VISAKHAPATNAM (AP-31)"
                }
            }
            return SurepassParsedData(
                rc_number=clean_plate,
                owner_name="VIJAYAWADA ROADWAYS LTD",
                rc_status="SUSPENDED",
                puc_valid_upto=puc_date,
                vehicle_class="Articulated Trailer",
                insurance_upto=(today + timedelta(days=50)).isoformat(),
                maker_model="BHARATBENZ 5528TT",
                raw_response=raw
            )

        if is_multi_fail:
            puc_expired = (today - timedelta(days=90)).isoformat()
            raw = {
                "status_code": 200,
                "success": True,
                "data": {
                    "rc_number": clean_plate,
                    "rc_status": "INACTIVE",
                    "owner_name": "NCR BULK CARRIERS",
                    "vehicle_class": "Heavy Freight Carrier",
                    "maker_model": "EICHER PRO 6028T",
                    "pucc_upto": puc_expired,
                    "insurance_upto": (today - timedelta(days=10)).isoformat()
                }
            }
            return SurepassParsedData(
                rc_number=clean_plate,
                owner_name="NCR BULK CARRIERS",
                rc_status="INACTIVE",
                puc_valid_upto=puc_expired,
                vehicle_class="Heavy Freight Carrier",
                insurance_upto=(today - timedelta(days=10)).isoformat(),
                maker_model="EICHER PRO 6028T",
                raw_response=raw
            )

        if is_permit_fail:
            permit_expired = (today - timedelta(days=25)).isoformat()
            puc_date = (today + timedelta(days=90)).isoformat()
            ins_date = (today + timedelta(days=180)).isoformat()
            raw = {
                "status_code": 200,
                "success": True,
                "message": "RC details verified successfully",
                "data": {
                    "client_id": "smeltiq_poc_client_permit_expired",
                    "rc_number": clean_plate,
                    "rc_status": "ACTIVE",
                    "owner_name": "COASTAL BULK FREIGHT LINES",
                    "vehicle_category": "HGV (Heavy Goods Vehicle)",
                    "vehicle_class": "Heavy Commercial Freight Carrier",
                    "maker_model": "TATA PRIMA 3530.K",
                    "pucc_upto": puc_date,
                    "insurance_upto": ins_date,
                    "permit_number": "AP31/P/2021/4819",
                    "permit_type": "GOODS CARRIER PERMIT",
                    "permit_valid_upto": permit_expired,
                    "national_permit_number": "NP/AP/2021/9012",
                    "national_permit_upto": permit_expired,
                    "national_permit_issued_by": "STA ANDHRA PRADESH",
                    "registered_at": "RTO VISAKHAPATNAM (AP-31)"
                }
            }
            return SurepassParsedData(
                rc_number=clean_plate,
                owner_name="COASTAL BULK FREIGHT LINES",
                rc_status="ACTIVE",
                puc_valid_upto=puc_date,
                vehicle_class="Heavy Commercial Freight Carrier",
                insurance_upto=ins_date,
                maker_model="TATA PRIMA 3530.K",
                permit_number="AP31/P/2021/4819",
                permit_type="GOODS CARRIER PERMIT",
                permit_valid_upto=permit_expired,
                national_permit_number="NP/AP/2021/9012",
                national_permit_upto=permit_expired,
                national_permit_issued_by="STA ANDHRA PRADESH",
                raw_response=raw
            )

        # Standard Compliant Testcases (e.g. AP31TJ9988, AP31CG7744, AP31AP8821, or custom)
        puc_date = (today + timedelta(days=120)).isoformat()
        ins_date = (today + timedelta(days=240)).isoformat()
        permit_date = (today + timedelta(days=180)).isoformat()
        np_date = (today + timedelta(days=210)).isoformat()

        if clean_plate == "AP31CG7744":
            owner = "VIZAG COASTAL SLAG HAULAGE"
            model = "EICHER PRO 6035 TRACTOR"
            permit_no = "AP31/P/2024/1102"
            np_no = "NP/AP/2024/7744"
        elif clean_plate == "AP31AP8821":
            owner = "APEX MINERAL LOGISTICS LTD"
            model = "TATA SIGNA 4825.TK"
            permit_no = "AP31/P/2023/8821"
            np_no = "NP/AP/2023/8821"
        else:
            owner = "RAMESH CHANDRA SHARMA"
            model = "TATA MOTORS PRIMA 2830.K"
            permit_no = "AP31/P/2023/9102"
            np_no = "NP/AP/2023/4481"

        raw = {
            "status_code": 200,
            "success": True,
            "message": "RC details verified successfully",
            "data": {
                "client_id": "smeltiq_poc_compliant_client",
                "rc_number": clean_plate,
                "rc_status": "ACTIVE",
                "owner_name": owner,
                "present_address": "Plot 44, Industrial Estate, Gajuwaka, Visakhapatnam, AP - 530026",
                "vehicle_category": "HGV (Heavy Goods Vehicle)",
                "vehicle_class": "Heavy Goods Vehicle / Multi-Axle",
                "body_type": "TIPPERS",
                "maker_model": model,
                "fuel_type": "DIESEL",
                "registration_date": "2021-03-15",
                "pucc_upto": puc_date,
                "insurance_upto": ins_date,
                "permit_number": permit_no,
                "permit_type": "NATIONAL PERMIT (GOODS)",
                "permit_valid_upto": permit_date,
                "national_permit_number": np_no,
                "national_permit_upto": np_date,
                "national_permit_issued_by": "STA ANDHRA PRADESH",
                "fitness_upto": (today + timedelta(days=360)).isoformat(),
                "registered_at": "RTO VISAKHAPATNAM (AP-31)"
            }
        }
        return SurepassParsedData(
            rc_number=clean_plate,
            owner_name=owner,
            rc_status="ACTIVE",
            puc_valid_upto=puc_date,
            vehicle_class="Heavy Goods Vehicle / Multi-Axle",
            insurance_upto=ins_date,
            maker_model=model,
            permit_number=permit_no,
            permit_type="NATIONAL PERMIT (GOODS)",
            permit_valid_upto=permit_date,
            national_permit_number=np_no,
            national_permit_upto=np_date,
            national_permit_issued_by="STA ANDHRA PRADESH",
            raw_response=raw
        )


surepass_service = SurepassService()
