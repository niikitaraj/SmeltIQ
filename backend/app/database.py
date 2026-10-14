import logging
import uuid
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger("smeltiq.database")

# In-Memory fallback store for out-of-the-box local testing without external connection
FALLBACK_VENDORS = [
    {
        "id": "e4a2c58e-5b3e-4b68-9a99-f41858349001",
        "vendor_code": "VEND-TATALOG-01",
        "vendor_name": "Tata Steel Supply Chain & Freight Logistics",
        "is_active": True,
        "contact_phone": "+91-891-2567890",
        "contact_email": "dispatch@tatalogistics.co.in",
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "e4a2c58e-5b3e-4b68-9a99-f41858349002",
        "vendor_code": "VEND-JINDAL-02",
        "vendor_name": "Jindal Heavy Transporters & Bulk Cargo Pvt Ltd",
        "is_active": True,
        "contact_phone": "+91-891-2789123",
        "contact_email": "operations@jindaltrans.com",
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "e4a2c58e-5b3e-4b68-9a99-f41858349003",
        "vendor_code": "VEND-VIZAG-03",
        "vendor_name": "Vizag Coastal Freight Carriers",
        "is_active": True,
        "contact_phone": "+91-891-2894567",
        "contact_email": "fleet@vizagfreight.com",
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "e4a2c58e-5b3e-4b68-9a99-f41858349004",
        "vendor_code": "VEND-APEX-04",
        "vendor_name": "Apex Ore & Minerals Haulage Ltd",
        "is_active": True,
        "contact_phone": "+91-891-2345678",
        "contact_email": "gate-desk@apexhaulage.in",
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "e4a2c58e-5b3e-4b68-9a99-f41858349099",
        "vendor_code": "VEND-BLACKLIST-99",
        "vendor_name": "Defunct Southern Roadways (Blacklisted)",
        "is_active": False,
        "contact_phone": "+91-891-2999000",
        "contact_email": "blocked@southernroadways.org",
        "created_at": datetime.utcnow().isoformat(),
    },
]

# Master demo profiles for Gate Guards, Supervisors, and Admins
FALLBACK_PROFILES: List[Dict[str, Any]] = [
    {
        "id": "a1111111-1111-1111-1111-111111111111",
        "employee_id": "GUARD-8812",
        "full_name": "R. Sharma (Shift Alpha Guard)",
        "role": "GATE_GUARD",
        "assigned_gate_id": "GATE-NORTH-01",
        "is_active": True,
        "pin": "1234",
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "a2222222-2222-2222-2222-222222222222",
        "employee_id": "GUARD-1042",
        "full_name": "K. V. Rao (Shift Bravo Guard)",
        "role": "GATE_GUARD",
        "assigned_gate_id": "GATE-SOUTH-02",
        "is_active": True,
        "pin": "1234",
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "a3333333-3333-3333-3333-333333333333",
        "employee_id": "SUPER88",
        "full_name": "Alok Gupta (Plant Operations Supervisor)",
        "role": "PLANT_SUPERVISOR",
        "assigned_gate_id": "ALL_GATES",
        "is_active": True,
        "pin": "SUPER88",
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "a4444444-4444-4444-4444-444444444444",
        "employee_id": "ADMIN-01",
        "full_name": "Meera Nair (Chief Security & Compliance Admin)",
        "role": "ADMIN",
        "assigned_gate_id": "ALL_GATES",
        "is_active": True,
        "pin": "ADMIN2026",
        "created_at": datetime.utcnow().isoformat(),
    },
]

# Initial in-memory movements
FALLBACK_MOVEMENTS: List[Dict[str, Any]] = [
    {
        "id": "7b8f368d-8069-4e78-bb5c-486a4da9cb10",
        "gate_id": "GATE-NORTH-01",
        "movement_type": "ENTRY",
        "vehicle_number": "AP31TJ9988",
        "ocr_confidence": 96.4,
        "owner_name": "RAMESH CHANDRA SHARMA",
        "vendor_id": "e4a2c58e-5b3e-4b68-9a99-f41858349001",
        "vendor_code": "VEND-TATALOG-01",
        "vendor_name": "Tata Steel Supply Chain & Freight Logistics",
        "rc_status": "ACTIVE",
        "puc_valid_until": (date.today() + timedelta(days=120)).isoformat(),
        "compliance_status": "ALLOWED",
        "rejection_reasons": [],
        "raw_surepass_payload": {
            "status_code": 200,
            "success": True,
            "data": {
                "rc_number": "AP31TJ9988",
                "rc_status": "ACTIVE",
                "owner_name": "RAMESH CHANDRA SHARMA",
                "vehicle_class": "Heavy Goods Vehicle",
                "puc_valid_upto": (date.today() + timedelta(days=120)).isoformat(),
                "insurance_upto": (date.today() + timedelta(days=200)).isoformat()
            }
        },
        "guard_id": "GUARD-8812",
        "override_reason": None,
        "supervisor_code": None,
        "overridden_at": None,
        "created_at": (datetime.utcnow() - timedelta(hours=3)).isoformat()
    },
    {
        "id": "9d1c1452-f671-46ab-a292-1cf7463fbb22",
        "gate_id": "GATE-NORTH-01",
        "movement_type": "ENTRY",
        "vehicle_number": "MH12AB5678",
        "ocr_confidence": 92.1,
        "owner_name": "SURESH TRUCKING CO.",
        "vendor_id": "e4a2c58e-5b3e-4b68-9a99-f41858349002",
        "vendor_code": "VEND-JINDAL-02",
        "vendor_name": "Jindal Heavy Transporters & Bulk Cargo Pvt Ltd",
        "rc_status": "ACTIVE",
        "puc_valid_until": (date.today() - timedelta(days=15)).isoformat(),
        "compliance_status": "DENIED",
        "rejection_reasons": [
            f"Pollution Under Control (PUC) certificate expired on {(date.today() - timedelta(days=15)).isoformat()}"
        ],
        "raw_surepass_payload": {
            "status_code": 200,
            "success": True,
            "data": {
                "rc_number": "MH12AB5678",
                "rc_status": "ACTIVE",
                "owner_name": "SURESH TRUCKING CO.",
                "vehicle_class": "Multi-Axle Truck",
                "puc_valid_upto": (date.today() - timedelta(days=15)).isoformat()
            }
        },
        "guard_id": "GUARD-8812",
        "override_reason": None,
        "supervisor_code": None,
        "overridden_at": None,
        "created_at": (datetime.utcnow() - timedelta(hours=1, minutes=45)).isoformat()
    }
]


class DatabaseManager:
    def __init__(self):
        self._supabase: Optional[Client] = None
        self._is_connected = False
        self._init_client()

    def _init_client(self):
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
        if url and key and "supabase.co" in url:
            try:
                self._supabase = create_client(url, key)
                self._is_connected = True
                logger.info("Successfully connected to Supabase PostgreSQL at %s", url)
            except Exception as e:
                logger.warning("Failed to initialize Supabase client (%s). Using in-memory fallback.", e)
                self._is_connected = False
        else:
            logger.info("Supabase credentials not configured. Running in high-fidelity in-memory persistence mode.")
            self._is_connected = False

    @property
    def is_connected(self) -> bool:
        return self._is_connected

    async def get_all_vendors(self, only_active: bool = False) -> List[Dict[str, Any]]:
        if self._is_connected and self._supabase:
            try:
                query = self._supabase.table("vendors").select("*")
                if only_active:
                    query = query.eq("is_active", True)
                res = query.order("vendor_name").execute()
                if res.data:
                    return res.data
            except Exception as e:
                logger.error("Error querying vendors from Supabase: %s. Reverting to fallback.", e)

        # Fallback
        if only_active:
            return [v for v in FALLBACK_VENDORS if v.get("is_active")]
        return FALLBACK_VENDORS

    async def get_vendor_by_code(self, vendor_code: str) -> Optional[Dict[str, Any]]:
        clean_code = vendor_code.strip()
        if self._is_connected and self._supabase:
            try:
                res = self._supabase.table("vendors").select("*").eq("vendor_code", clean_code).limit(1).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error("Error querying vendor %s from Supabase: %s", clean_code, e)

        # Fallback
        for v in FALLBACK_VENDORS:
            if v["vendor_code"].lower() == clean_code.lower():
                return v
        return None

    async def create_gate_movement(self, record: Dict[str, Any]) -> Dict[str, Any]:
        if "id" not in record or not record["id"]:
            record["id"] = str(uuid.uuid4())
        if "created_at" not in record:
            record["created_at"] = datetime.utcnow().isoformat()

        if self._is_connected and self._supabase:
            try:
                # Prepare payload for Supabase table schema
                db_record = {
                    "id": record["id"],
                    "gate_id": record.get("gate_id"),
                    "movement_type": record.get("movement_type", "ENTRY"),
                    "vehicle_number": record.get("vehicle_number"),
                    "ocr_confidence": record.get("ocr_confidence"),
                    "owner_name": record.get("owner_name"),
                    "vendor_id": record.get("vendor_id"),
                    "rc_status": record.get("rc_status"),
                    "puc_valid_until": record.get("puc_valid_until"),
                    "compliance_status": record.get("compliance_status"),
                    "rejection_reasons": record.get("rejection_reasons", []),
                    "raw_surepass_payload": record.get("raw_surepass_payload", {}),
                    "guard_id": record.get("guard_id"),
                    "created_at": record["created_at"]
                }
                res = self._supabase.table("gate_movements").insert(db_record).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error("Error inserting movement to Supabase: %s. Storing in fallback.", e)

        # Store in in-memory list
        FALLBACK_MOVEMENTS.insert(0, record)
        return record

    async def override_gate_movement(
        self,
        movement_id: str,
        guard_id: str,
        supervisor_code: str,
        override_reason: str
    ) -> Optional[Dict[str, Any]]:
        now_iso = datetime.utcnow().isoformat()
        
        if self._is_connected and self._supabase:
            try:
                update_payload = {
                    "compliance_status": "OVERRIDDEN",
                    "override_reason": override_reason,
                    "supervisor_code": supervisor_code,
                    "guard_id": guard_id,
                    "overridden_at": now_iso
                }
                res = self._supabase.table("gate_movements").update(update_payload).eq("id", movement_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error("Error updating override on Supabase: %s", e)

        # Update in-memory record
        for item in FALLBACK_MOVEMENTS:
            if item.get("id") == movement_id:
                item["compliance_status"] = "OVERRIDDEN"
                item["override_reason"] = override_reason
                item["supervisor_code"] = supervisor_code
                item["guard_id"] = guard_id
                item["overridden_at"] = now_iso
                return item

        return None

    async def get_recent_movements(self, limit: int = 50) -> List[Dict[str, Any]]:
        if self._is_connected and self._supabase:
            try:
                res = self._supabase.table("gate_movements") \
                    .select("*, vendors(vendor_code, vendor_name)") \
                    .order("created_at", desc=True) \
                    .limit(limit) \
                    .execute()
                if res.data:
                    # Flatten vendor data if nested
                    enriched = []
                    for row in res.data:
                        v = row.get("vendors") or {}
                        row["vendor_code"] = v.get("vendor_code")
                        row["vendor_name"] = v.get("vendor_name")
                        enriched.append(row)
                    return enriched
            except Exception as e:
                logger.error("Error fetching recent movements from Supabase: %s", e)

        # In-memory return
        return FALLBACK_MOVEMENTS[:limit]

    async def get_profile(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Find user profile by employee_id, id, or email from Supabase or fallback store"""
        clean_id = identifier.strip()
        if self._is_connected and self._supabase:
            try:
                res = self._supabase.table("profiles") \
                    .select("*") \
                    .or_(f"employee_id.eq.{clean_id},id.eq.{clean_id}") \
                    .execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error("Error looking up profile in Supabase: %s", e)

        # Fallback store search
        for p in FALLBACK_PROFILES:
            if (
                p["employee_id"].lower() == clean_id.lower()
                or p["id"] == clean_id
                or clean_id.lower() in p["full_name"].lower()
            ):
                return p
        return None

    async def list_profiles(self) -> List[Dict[str, Any]]:
        """List all active personnel profiles"""
        if self._is_connected and self._supabase:
            try:
                res = self._supabase.table("profiles").select("*").order("created_at").execute()
                if res.data:
                    return res.data
            except Exception as e:
                logger.error("Error listing profiles from Supabase: %s", e)
        return FALLBACK_PROFILES

    async def authenticate_user(
        self,
        employee_id: str,
        password_or_pin: str,
        login_type: str = "GUARD_QUICK_SHIFT",
        assigned_gate_id: str = "GATE-NORTH-01"
    ) -> Optional[Dict[str, Any]]:
        """
        Authenticate guard shift login or supervisor credentials.
        Returns user profile with assigned role and permissions.
        """
        profile = await self.get_profile(employee_id)
        if not profile:
            # If quick login as guard not yet in DB, dynamically create shift profile
            if login_type == "GUARD_QUICK_SHIFT" or employee_id.upper().startswith("GUARD"):
                profile = {
                    "id": str(uuid.uuid4()),
                    "employee_id": employee_id.upper(),
                    "full_name": f"Officer {employee_id.upper()}",
                    "role": "GATE_GUARD",
                    "assigned_gate_id": assigned_gate_id,
                    "is_active": True,
                    "pin": password_or_pin,
                    "created_at": datetime.utcnow().isoformat()
                }
            else:
                return None

        # Verify PIN/Password
        expected_pin = profile.get("pin")
        # For supervisor role, accept master code 'SUPER88' or matching PIN
        if profile["role"] in ["PLANT_SUPERVISOR", "ADMIN"]:
            if password_or_pin.strip() not in [expected_pin, "SUPER88", "ADMIN2026"]:
                return None
        else:
            # For guard, accept expected PIN or standard demo PIN '1234'
            if expected_pin and password_or_pin.strip() not in [expected_pin, "1234"]:
                return None

        # Update assigned gate if provided
        if assigned_gate_id:
            profile["assigned_gate_id"] = assigned_gate_id

        # Determine permissions based on RBAC role
        role = profile["role"]
        if role == "ADMIN":
            permissions = [
                "SCAN_OCR",
                "VERIFY_COMPLIANCE",
                "APPROVE_OVERRIDE",
                "MANAGE_VENDORS",
                "EXPORT_AUDIT",
                "ADMIN_SETTINGS"
            ]
        elif role == "PLANT_SUPERVISOR":
            permissions = [
                "SCAN_OCR",
                "VERIFY_COMPLIANCE",
                "APPROVE_OVERRIDE",
                "MANAGE_VENDORS",
                "EXPORT_AUDIT"
            ]
        else:  # GATE_GUARD
            permissions = [
                "SCAN_OCR",
                "VERIFY_COMPLIANCE",
                "REQUEST_OVERRIDE"
            ]

        profile_clean = {k: v for k, v in profile.items() if k != "pin"}
        return {
            "user": profile_clean,
            "permissions": permissions
        }

    async def update_vendor_status(self, vendor_code: str, is_active: bool) -> Optional[Dict[str, Any]]:
        """Update active status of a vendor (Supervisor/Admin capability)"""
        clean_code = vendor_code.strip().upper()
        if self._is_connected and self._supabase:
            try:
                res = self._supabase.table("vendors") \
                    .update({"is_active": is_active}) \
                    .eq("vendor_code", clean_code) \
                    .execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error("Error updating vendor in Supabase: %s", e)

        for v in FALLBACK_VENDORS:
            if v["vendor_code"].upper() == clean_code:
                v["is_active"] = is_active
                return v
        return None


db_manager = DatabaseManager()
