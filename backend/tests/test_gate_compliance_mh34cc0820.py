"""
Automated Gate Entry Compliance Unit Tests
Target Record: MH34CC0820 (Omesh Tikaram Bansod - TVS Jupiter ZX)
Verified Surepass Payload - Evaluates Statutory Expired PUC Violation
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.surepass_service import surepass_service
from app.services.compliance_service import compliance_engine
from app.schemas import ComplianceVerifyRequest


@pytest.mark.asyncio
async def test_surepass_mock_payload_mh34cc0820():
    """
    Verify that Surepass Service returns the verified real payload for MH34CC0820.
    """
    rc_data = await surepass_service.fetch_rc_details("MH34CC0820", scenario_override="EXPIRED_PUC")
    
    assert rc_data.rc_number == "MH34CC0820"
    assert "OMESH" in rc_data.owner_name.upper()
    assert rc_data.rc_status == "ACTIVE"
    assert rc_data.puc_valid_upto == "2026-07-03"
    assert rc_data.insurance_upto == "2027-07-18"
    assert "TVS JUPITER" in rc_data.maker_model


@pytest.mark.asyncio
async def test_compliance_rule_evaluation_mh34cc0820():
    """
    Verify that Compliance Engine denies entry for MH34CC0820 due to expired PUC.
    """
    req = ComplianceVerifyRequest(
        vehicle_number="MH34CC0820",
        expected_vendor_code="VEND-TATALOG-01",
        guard_id="GUARD-TEST-01",
        gate_id="GATE-01",
        movement_type="ENTRY",
        ocr_confidence=98.50
    )
    
    decision = await compliance_engine.verify_vehicle_entry(req)
    
    assert decision.vehicle_number == "MH34CC0820"
    assert decision.compliance_status == "DENIED"
    assert any("PUC" in reason or "Pollution" in reason for reason in decision.rejection_reasons)
    assert decision.owner_name == "OMESH TIKARAM BANSOD"


@pytest.mark.asyncio
async def test_api_mock_endpoint_mh34cc0820():
    """
    Verify FastAPI Mock Route Handler: /api/v1/gate/mock/testcase/MH34CC0820
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/gate/mock/testcase/MH34CC0820?gate_id=GATE-01&guard_id=GUARD-TEST-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["testcase"] == "MH34CC0820"
        assert data["expected_status"] == "DENIED"
        assert data["evaluation"]["passed"] is True
        assert data["vehicle_details"]["owner_name"] == "Omesh Tikaram Bansod"
        assert data["vehicle_details"]["puc_valid_until"] == "2026-07-03"
