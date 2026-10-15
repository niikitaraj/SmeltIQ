"""
Automated Unit Tests for Cache-First Vehicle Verification
Workflow:
1. Check Supabase / fallback database first for vehicle registration (0 API Cost).
2. If vehicle not found, call Surepass Sandbox API (/rc/rc-full).
3. Evaluate rules and persist record to Supabase.
4. Subsequent calls hit the cache.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from datetime import date, timedelta
from app.main import app
from app.database import db_manager
from app.services.compliance_service import compliance_engine
from app.schemas import ComplianceVerifyRequest


@pytest.mark.asyncio
async def test_cache_hit_seeded_vehicle_mh34cc0820():
    """
    Test that a seeded vehicle (MH34CC0820) is retrieved from cache with 0 API cost.
    """
    req = ComplianceVerifyRequest(
        vehicle_number="MH34CC0820",
        expected_vendor_code="VEND-TATALOG-01",
        guard_id="GUARD-8812",
        gate_id="GATE-NORTH-01",
        movement_type="ENTRY",
        ocr_confidence=98.5
    )

    decision = await compliance_engine.verify_vehicle_entry(req)

    assert decision.vehicle_number == "MH34CC0820"
    assert decision.is_cached is True
    assert decision.data_source == "SUPABASE_CACHE"
    assert "OMESH" in decision.owner_name.upper()
    assert decision.compliance_status == "DENIED"  # Expired PUC


@pytest.mark.asyncio
async def test_cache_hit_seeded_vehicle_ap31tj9988():
    """
    Test that compliant carrier AP31TJ9988 is retrieved from cache.
    """
    req = ComplianceVerifyRequest(
        vehicle_number="AP31TJ9988",
        expected_vendor_code="VEND-TATALOG-01",
        guard_id="GUARD-8812",
        gate_id="GATE-NORTH-01",
        movement_type="ENTRY",
        ocr_confidence=96.4
    )

    decision = await compliance_engine.verify_vehicle_entry(req)

    assert decision.vehicle_number == "AP31TJ9988"
    assert decision.is_cached is True
    assert decision.data_source == "SUPABASE_CACHE"
    assert decision.compliance_status == "ALLOWED"


@pytest.mark.asyncio
async def test_cache_endpoint_lookup():
    """
    Test /api/v1/gate/cache/{vehicle_number} endpoint for HIT and MISS.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test Cache HIT
        hit_resp = await client.get("/api/v1/gate/cache/MH34CC0820")
        assert hit_resp.status_code == 200
        hit_data = hit_resp.json()
        assert hit_data["cached"] is True
        assert hit_data["vehicle_number"] == "MH34CC0820"
        assert hit_data["data_source"] == "SUPABASE_CACHE"
        assert hit_data["api_cost"] == 0

        # 2. Test Cache MISS
        miss_resp = await client.get("/api/v1/gate/cache/UNREGISTERED9999")
        assert miss_resp.status_code == 200
        miss_data = miss_resp.json()
        assert miss_data["cached"] is False
        assert miss_data["data_source"] == "NOT_CACHED"


@pytest.mark.asyncio
async def test_cache_population_after_first_verification():
    """
    Test that verifying a new vehicle inserts it into the database,
    making subsequent verifications hit the cache.
    """
    test_plate = "KA01AB1122"
    
    # 1. Verify plate is not currently in database
    existing = await db_manager.get_cached_vehicle_data(test_plate)
    assert existing is None

    # 2. First verification (simulating new vehicle entry)
    req1 = ComplianceVerifyRequest(
        vehicle_number=test_plate,
        expected_vendor_code="VEND-TATALOG-01",
        guard_id="GUARD-8812",
        gate_id="GATE-NORTH-01",
        movement_type="ENTRY",
        ocr_confidence=95.0,
        simulate_scenario="ALLOWED"  # Uses simulation to populate initial record
    )
    decision1 = await compliance_engine.verify_vehicle_entry(req1)
    assert decision1.vehicle_number == test_plate

    # 3. Second verification without simulate_scenario must hit cache
    req2 = ComplianceVerifyRequest(
        vehicle_number=test_plate,
        expected_vendor_code="VEND-TATALOG-01",
        guard_id="GUARD-8812",
        gate_id="GATE-NORTH-01",
        movement_type="ENTRY",
        ocr_confidence=95.0
    )
    decision2 = await compliance_engine.verify_vehicle_entry(req2)
    assert decision2.vehicle_number == test_plate
    assert decision2.is_cached is True
    assert decision2.data_source == "SUPABASE_CACHE"
