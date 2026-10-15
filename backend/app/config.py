import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "SmeltIQ Gate Entry Compliance System"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Surepass Sandbox Configuration
    SUREPASS_ENV: str = "sandbox"
    SUREPASS_BASE_URL: str = "https://api.surepass.io/api/v1"
    SUREPASS_API_KEY: Optional[str] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc5MTgwOTU5NSwianRpIjoiYzg1ZjBhMjItZGFmYS00NWQ0LTkyZmMtYjhmZGUxMzlhNTQ4IiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5IjoiZGV2LnNtZWx0aXFAc3VyZXBhc3MuaW8iLCJuYmYiOjE3OTE4MDk1OTUsImV4cCI6MTc5NDQwMTU5NSwiZW1haWwiOiJzbWVsdGlxQHN1cmVwYXNzLmlvIiwidGVuYW50X2lkIjoibWFpbiIsInVzZXJfY2xhaW1zIjp7InNjb3BlcyI6WyJ1c2VyIl19fQ.UGUvNbwV_Wqi0V3HBUXisRsE5WZss7XXiDBWaUvUCag"
    SUREPASS_SANDBOX_TOKEN: Optional[str] = None
    SUREPASS_API_URL: Optional[str] = "https://api.surepass.io/api/v1/rc/rc-v2"
    SUREPASS_API_TOKEN: Optional[str] = None
    
    # Toggle mock mode (defaults to False when token is provided to query Surepass Sandbox)
    SUREPASS_MOCK: bool = False
    
    # Supabase PostgreSQL Configuration
    SUPABASE_URL: str = "https://zklxevkhcgxwnpwwijal.supabase.co"
    SUPABASE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprbHhldmtoY2d4d25wd3dpamFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzIwMDYsImV4cCI6MjEwNzQ0ODAwNn0.Q7gy0oSp75hkNW9jiPBd1UF3iwyGR4sFysa56EAXlmE"
    SUPABASE_SERVICE_ROLE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprbHhldmtoY2d4d25wd3dpamFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzIwMDYsImV4cCI6MjEwNzQ0ODAwNn0.Q7gy0oSp75hkNW9jiPBd1UF3iwyGR4sFysa56EAXlmE"
    
    # Security / Guard Override
    SUPERVISOR_OVERRIDE_PIN: str = "SUPER88"
    
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_surepass_token(self) -> str:
        return self.SUREPASS_API_KEY or self.SUREPASS_SANDBOX_TOKEN or self.SUREPASS_API_TOKEN or ""

    def get_surepass_rc_url(self) -> str:
        if self.SUREPASS_API_URL and self.SUREPASS_API_URL.strip():
            return self.SUREPASS_API_URL.strip()
        base = self.SUREPASS_BASE_URL.rstrip("/")
        if "/rc" in base:
            return base
        return f"{base}/rc/rc-v2"

    def is_surepass_mock_active(self) -> bool:
        token = self.get_surepass_token()
        if not token or token.strip() == "":
            return True
        return self.SUREPASS_MOCK


settings = Settings()
