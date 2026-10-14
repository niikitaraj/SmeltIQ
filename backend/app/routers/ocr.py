import logging
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Body
from app.schemas import OCRRequest, OCRResult
from app.services.ocr_service import ocr_service

logger = logging.getLogger("smeltiq.router.ocr")
router = APIRouter(prefix="/ocr", tags=["License Plate OCR"])


@router.post("/extract", response_model=OCRResult, summary="Extract vehicle plate number via OCR")
async def extract_license_plate(
    payload: Optional[OCRRequest] = Body(None),
    file: Optional[UploadFile] = File(None),
    mock_plate: Optional[str] = Form(None)
):
    """
    Extract registration number from an uploaded camera snapshot or base64 data.
    Accepts either:
    1. JSON body with `image_base64`
    2. Multipart file upload (`file`)
    """
    try:
        # Check if file was uploaded as multipart
        if file is not None:
            contents = await file.read()
            if not contents:
                raise HTTPException(status_code=400, detail="Uploaded file is empty.")
            vehicle_num, conf, raw_text, engine = ocr_service.extract_plate_from_bytes(
                contents,
                mock_override=mock_plate or (payload.mock_plate if payload else None)
            )
            return OCRResult(
                vehicle_number=vehicle_num,
                confidence=conf,
                raw_text=raw_text,
                method_used=engine
            )

        # Check JSON payload
        if payload and payload.image_base64:
            vehicle_num, conf, raw_text, engine = ocr_service.extract_from_base64(
                payload.image_base64,
                mock_override=payload.mock_plate
            )
            return OCRResult(
                vehicle_number=vehicle_num,
                confidence=conf,
                raw_text=raw_text,
                method_used=engine
            )

        # Check if mock plate provided directly without image
        if payload and payload.mock_plate:
            vehicle_num, conf, raw_text, engine = ocr_service.extract_plate_from_bytes(
                b"",
                mock_override=payload.mock_plate
            )
            return OCRResult(
                vehicle_number=vehicle_num,
                confidence=conf,
                raw_text=raw_text,
                method_used=engine
            )

        raise HTTPException(
            status_code=400,
            detail="Either 'image_base64' in JSON or multipart 'file' upload must be provided."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("OCR extraction endpoint failed: %s", e)
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
