import logging
from typing import List
from fastapi import APIRouter, HTTPException, Query
from app.schemas import VendorSchema
from app.database import db_manager

logger = logging.getLogger("smeltiq.router.vendors")
router = APIRouter(prefix="/vendors", tags=["Plant Vendors"])


@router.get("", response_model=List[VendorSchema], summary="List registered steel plant logistics vendors")
async def list_vendors(only_active: bool = Query(True, description="Filter for active vendors only")):
    """
    Retrieve registered vendors from Supabase vendors table.
    Used to populate vendor selection dropdown in the gate guard console.
    """
    try:
        vendors = await db_manager.get_all_vendors(only_active=only_active)
        return vendors
    except Exception as e:
        logger.error("Failed fetching vendors: %s", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve vendor directory.")
