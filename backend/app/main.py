import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import ocr, gate, vendors, auth
from app.database import db_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s"
)
logger = logging.getLogger("smeltiq.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=======================================================")
    logger.info("   Starting SmeltIQ Gate Entry Compliance System       ")
    logger.info("   Surepass Mock Mode: %s                              ", settings.is_surepass_mock_active())
    logger.info("   Supabase Connected: %s                              ", db_manager.is_connected)
    logger.info("=======================================================")
    yield
    logger.info("Shutting down SmeltIQ Gate Entry System.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Automated Gate Entry Compliance & OCR Verification Engine for Steel Plant Operations",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(ocr.router, prefix=settings.API_V1_PREFIX)
app.include_router(gate.router, prefix=settings.API_V1_PREFIX)
app.include_router(vendors.router, prefix=settings.API_V1_PREFIX)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health"])
async def root():
    return {
        "system": settings.APP_NAME,
        "status": "OPERATIONAL",
        "version": "1.0.0",
        "docs_url": "/docs",
        "surepass_mock_mode": settings.is_surepass_mock_active(),
        "database_type": "Supabase PostgreSQL" if db_manager.is_connected else "Local In-Memory Fallback"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "surepass_mode": "MOCK" if settings.is_surepass_mock_active() else "LIVE_API",
        "surepass_target_url": settings.get_surepass_rc_url(),
        "supabase_connected": db_manager.is_connected,
        "ocr_engine": "Active (PyTesseract / OpenCV / Adaptive Heuristic)"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
