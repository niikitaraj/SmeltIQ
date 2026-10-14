import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Header, Body
from app.schemas import (
    LoginRequest,
    LoginResponse,
    UserProfileSchema,
    VendorSchema
)
from app.database import db_manager

logger = logging.getLogger("smeltiq.router.auth")
router = APIRouter(prefix="/auth", tags=["Role-Based Authentication & User Profiles"])


@router.post("/login", response_model=LoginResponse, summary="Shift Login for Guards or Secure Login for Supervisors")
async def login(request: LoginRequest):
    """
    Role-based authentication endpoint:
    - GATE_GUARD: Fast shift login using Guard ID and PIN (e.g. GUARD-8812 / 1234)
    - PLANT_SUPERVISOR: Supervisor access with Master PIN (e.g. SUPER88 / SUPER88)
    - ADMIN: Administrative access with master credentials (e.g. ADMIN-01 / ADMIN2026)
    """
    try:
        auth_result = await db_manager.authenticate_user(
            employee_id=request.employee_id,
            password_or_pin=request.password_or_pin,
            login_type=request.login_type,
            assigned_gate_id=request.assigned_gate_id or "GATE-NORTH-01"
        )

        if not auth_result:
            raise HTTPException(
                status_code=401,
                detail="Authentication failed. Invalid Employee ID, PIN, or authorization credentials."
            )

        user_data = auth_result["user"]
        permissions = auth_result["permissions"]
        token = f"smeltiq_{user_data['role'].lower()}_{uuid.uuid4().hex[:16]}"

        return LoginResponse(
            access_token=token,
            token_type="bearer",
            user=UserProfileSchema(**user_data),
            permissions=permissions,
            message=f"Welcome {user_data['full_name']} ({user_data['role']})"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login process error: %s", e)
        raise HTTPException(status_code=500, detail="Internal authentication service error")


@router.get("/profiles", response_model=List[UserProfileSchema], summary="List all plant staff profiles")
async def list_profiles():
    """Retrieve all active employee profiles with their assigned roles and gate terminals."""
    try:
        profiles = await db_manager.list_profiles()
        return [UserProfileSchema(**p) for p in profiles]
    except Exception as e:
        logger.error("Error listing profiles: %s", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve employee profiles")


@router.get("/me", response_model=UserProfileSchema, summary="Get current logged in profile")
async def get_current_user(employee_id: str = Query("GUARD-8812")):
    """Retrieve profile for specified employee identifier."""
    profile = await db_manager.get_profile(employee_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    return UserProfileSchema(**profile)


@router.post("/logout", summary="Session Logout")
async def logout(employee_id: Optional[str] = None):
    """End current guard shift or supervisor session."""
    return {
        "status": "SUCCESS",
        "message": f"Session terminated for {employee_id or 'user'}. Shift logged out safely."
    }


@router.patch("/vendors/{vendor_code}/status", response_model=VendorSchema, summary="Supervisor vendor toggle")
async def toggle_vendor_status(
    vendor_code: str,
    is_active: bool = Body(..., embed=True),
    supervisor_code: str = Header("SUPER88")
):
    """
    Supervisor / Admin only action: Activate or suspend logistics contractor.
    Requires supervisor code verification.
    """
    if supervisor_code.strip() not in ["SUPER88", "ADMIN2026"]:
        raise HTTPException(status_code=403, detail="Supervisor or Admin authorization required.")

    updated = await db_manager.update_vendor_status(vendor_code, is_active)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Vendor '{vendor_code}' not found.")
    return VendorSchema(**updated)
