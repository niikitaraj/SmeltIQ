# SmeltIQ | Full-Stack Gate Entry Compliance & ANPR System

An automated, full-stack Proof of Concept (PoC) built for steel manufacturing plant entry/exit gates (e.g. Vizag Steel Works). The system captures vehicle license plate images, runs OCR to extract the registration number, verifies statutory compliance (Owner name, Vehicle RC status, Pollution Under Control / PUC validity) via Surepass APIs, enforces entry authorization rules, and records audit logs into a Supabase PostgreSQL database.

---

## 🏗️ Architecture Overview

```
                                  +---------------------------------------------+
                                  |     React 18 + Tailwind Mobile Guard UI     |
                                  |  - HTML5 MediaDevices (Live ANPR WebCam)    |
                                  |  - Optical Plate Frame Grabber              |
                                  |  - Real-time Statutory Decision Card        |
                                  |  - Supervisor Security Override Modal       |
                                  +----------------------+----------------------+
                                                         |
                                    REST API (JSON / Multipart)
                                                         |
                                                         v
                                  +---------------------------------------------+
                                  |            FastAPI Backend Engine           |
                                  |                                             |
                                  |  [ OCR Service ]     [ Rule Matrix Engine ] |
                                  |  - PyTesseract       - Rule 1: RC Active    |
                                  |  - OpenCV Threshold  - Rule 2: PUC >= Today |
                                  |  - Regex Extractor   - Rule 3: Vendor Match |
                                  +-----------+---------------------+-----------+
                                              |                     |
                            Live / Mock RC    |                     | Movements & Audit
                            API Calls         |                     | Ingestion (JSONB)
                                              v                     v
                         +-------------------------+   +-------------------------+
                         |      Surepass API       |   |   Supabase PostgreSQL   |
                         | (RC Full v1 Endpoint)   |   |   - vendors master      |
                         | - Owner, RC status      |   |   - gate_movements log  |
                         | - PUC validity date     |   |   - raw_surepass_payload|
                         +-------------------------+   +-------------------------+
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite, HTML5 MediaDevices API |
| **Backend** | Python 3.11+, FastAPI (Async), Pydantic v2, HTTPX, PyTesseract, OpenCV Headless |
| **Database** | Supabase PostgreSQL 15+ (with JSONB, GIN indexing, and Row Level Security) |
| **Containerization** | Docker, Docker Compose, Nginx (Alpine) |

---

## 📂 Project Directory Structure

```
VizagSteel/
├── database/
│   ├── schema.sql           # Complete Supabase PostgreSQL DDL (Tables, Enums, Indexes, RLS)
│   └── seed.sql             # Approved logistics vendors and sample movement audit logs
├── backend/
│   ├── app/
│   │   ├── config.py        # Settings via Pydantic BaseSettings (.env integration)
│   │   ├── database.py      # Supabase Client with resilient in-memory fallback
│   │   ├── schemas.py       # Pydantic v2 validation models
│   │   ├── services/
│   │   │   ├── ocr_service.py        # Image preprocessor, PyTesseract & plate regex
│   │   │   ├── surepass_service.py   # Surepass RC-Full integration & mock engine
│   │   │   └── compliance_service.py # 3-Rule Matrix & override engine
│   │   ├── routers/
│   │   │   ├── ocr.py       # POST /api/v1/ocr/extract
│   │   │   ├── gate.py      # POST /api/v1/gate/verify & POST /api/v1/gate/override
│   │   │   └── vendors.py   # GET /api/v1/vendors
│   │   └── main.py          # FastAPI application entrypoint with CORS & health check
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile           # Backend container with Tesseract & OpenCV
│   └── .env.example         # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx           # Telemetry status bar & gate indicator
│   │   │   ├── CameraCapture.tsx    # Live WebCam ANPR & quick test presets
│   │   │   ├── VerificationForm.tsx # Registration entry & vendor dropdown
│   │   │   ├── ComplianceCard.tsx   # Live decision card & Surepass audit view
│   │   │   ├── OverrideModal.tsx    # Supervisor approval code & override rationale
│   │   │   ├── MovementHistory.tsx  # Searchable gate movement audit table
│   │   │   └── StatsSummary.tsx     # KPI summary cards
│   │   ├── services/api.ts          # REST client communicating with FastAPI
│   │   ├── types.ts                 # Domain TypeScript interfaces
│   │   ├── App.tsx                  # Master state orchestration
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── Dockerfile           # Multi-stage production Nginx container
│   └── .env.example
├── docker-compose.yml       # Full stack containerization (Database, Backend, Frontend)
├── .env.example             # Root configuration file
└── README.md
```

---

## 📋 1. Database Architecture (`database/schema.sql`)

### Tables & Enums
- **`movement_type_enum`**: `'ENTRY'`, `'EXIT'`
- **`compliance_status_enum`**: `'ALLOWED'`, `'DENIED'`, `'OVERRIDDEN'`
- **`vendors`**:
  - `id`: UUID (Primary Key, `gen_random_uuid()`)
  - `vendor_code`: VARCHAR(50) (UNIQUE)
  - `vendor_name`: VARCHAR(255)
  - `is_active`: BOOLEAN (DEFAULT TRUE)
  - `created_at`: TIMESTAMPTZ
- **`gate_movements`**:
  - `id`: UUID (Primary Key)
  - `gate_id`: VARCHAR(50)
  - `movement_type`: `movement_type_enum`
  - `vehicle_number`: VARCHAR(20) (Indexed)
  - `ocr_confidence`: NUMERIC(5, 2)
  - `owner_name`: VARCHAR(255)
  - `vendor_id`: UUID (FK to `vendors`)
  - `rc_status`: VARCHAR(50)
  - `puc_valid_until`: DATE
  - `compliance_status`: `compliance_status_enum`
  - `rejection_reasons`: TEXT[]
  - `raw_surepass_payload`: JSONB (GIN Indexed for forensic audit queries)
  - `guard_id`: VARCHAR(50)
  - `override_reason`: TEXT
  - `supervisor_code`: VARCHAR(50)
  - `overridden_at`: TIMESTAMPTZ
  - `created_at`: TIMESTAMPTZ

---

## ⚙️ 2. Automated Rule Engine Matrix

When a vehicle reaches the gate, the backend evaluates the statutory and plant authorization rules in sequence:

| Rule | Requirement | Evaluation Criteria | On Failure |
| :--- | :--- | :--- | :--- |
| **Rule 1: RC Active** | Vehicle Registration Certificate | `rc_status.toUpperCase() == "ACTIVE"` | DENIED: "Statutory RC Violation: Vehicle Registration status is [STATUS] (Mandatory: ACTIVE)" |
| **Rule 2: PUC Valid** | Pollution Under Control Certificate | `puc_valid_upto >= today()` | DENIED: "Environmental Compliance Violation: Pollution Under Control (PUC) certificate expired on [DATE]" |
| **Rule 3: Vendor Match** | Active Registered Plant Transporter | `vendor exists && vendor.is_active == True` | DENIED: "Associated logistics vendor is SUSPENDED or UNRECOGNIZED" |

- **Decision Outcome**:
  - If **all rules pass** $\rightarrow$ `ALLOWED` (Emerald Badge).
  - If **any rule fails** $\rightarrow$ `DENIED` (Crimson Badge) with itemized violation grounds.
  - If guard submits supervisor authorization $\rightarrow$ `OVERRIDDEN` (Amber Badge).

---

## 📡 3. Backend Endpoints Summary

### A. License Plate OCR Extraction
`POST /api/v1/ocr/extract`
- **Request Body (JSON)**:
  ```json
  {
    "image_base64": "data:image/jpeg;base64,...",
    "mock_plate": "AP31TJ9988"
  }
  ```
  *(Or multipart form-data uploading a binary file via key `file`)*
- **Response (`OCRResult`)**:
  ```json
  {
    "vehicle_number": "AP31TJ9988",
    "confidence": 96.4,
    "raw_text": "AP 31 TJ 9988",
    "method_used": "PYTESSERACT"
  }
  ```

### B. Statutory Compliance Verification
`POST /api/v1/gate/verify`
- **Request Body (`ComplianceVerifyRequest`)**:
  ```json
  {
    "vehicle_number": "AP31TJ9988",
    "expected_vendor_code": "VEND-TATALOG-01",
    "guard_id": "GUARD-8812",
    "gate_id": "GATE-NORTH-01",
    "movement_type": "ENTRY",
    "ocr_confidence": 96.4
  }
  ```
- **Response (`ComplianceDecision`)**:
  ```json
  {
    "movement_id": "7b8f368d-8069-4e78-bb5c-486a4da9cb10",
    "vehicle_number": "AP31TJ9988",
    "owner_name": "RAMESH CHANDRA SHARMA",
    "vendor_code": "VEND-TATALOG-01",
    "vendor_name": "Tata Steel Supply Chain & Freight Logistics",
    "rc_status": "ACTIVE",
    "puc_valid_until": "2027-02-15",
    "puc_status": "VALID",
    "compliance_status": "ALLOWED",
    "rejection_reasons": [],
    "timestamp": "2026-10-12T14:30:00Z",
    "guard_id": "GUARD-8812",
    "gate_id": "GATE-NORTH-01",
    "vehicle_class": "Heavy Goods Vehicle / Multi-Axle",
    "raw_surepass_payload": { ... }
  }
  ```

### C. Guard Manual Override
`POST /api/v1/gate/override`
- **Request Body (`GuardOverrideRequest`)**:
  ```json
  {
    "movement_id": "9d1c1452-f671-46ab-a292-1cf7463fbb22",
    "guard_id": "GUARD-8812",
    "supervisor_code": "SUPER88",
    "override_reason": "Emergency slag transport authorized by Shift Incharge Capt. Rao"
  }
  ```
- **Response (`GuardOverrideResponse`)**:
  ```json
  {
    "movement_id": "9d1c1452-f671-46ab-a292-1cf7463fbb22",
    "previous_status": "DENIED",
    "new_status": "OVERRIDDEN",
    "guard_id": "GUARD-8812",
    "supervisor_code": "SUPER88",
    "override_reason": "Emergency slag transport authorized by Shift Incharge Capt. Rao",
    "overridden_at": "2026-10-12T14:35:10Z",
    "message": "Gate movement successfully overridden and authorized."
  }
  ```

### D. Audit Log & Master Data
- `GET /api/v1/gate/movements?limit=50`: Returns live audit movements from Supabase.
- `GET /api/v1/vendors?only_active=true`: Returns registered plant logistics vendors.

---

## 🧪 4. Built-in Mock Test Scenarios

The system includes simulated Surepass responses enabled when `SUREPASS_MOCK=true`. Use the test presets in the UI for instant demonstration:

| Vehicle Number | Associated Vendor | RC Status | PUC Status | Result | Scenario Demonstrated |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`AP31TJ9988`** | `VEND-TATALOG-01` (Tata Logistics) | **ACTIVE** | **Valid (+120d)** | 🟢 **`ALLOWED`** | Fully compliant vehicle passes all statutory checks. |
| **`MH12AB5678`** | `VEND-JINDAL-02` (Jindal Trans) | **ACTIVE** | **Expired (-22d)** | 🔴 **`DENIED`** | PUC expiry triggers environmental compliance violation. |
| **`AP31XX0001`** | `VEND-VIZAG-03` (Vizag Freight) | **SUSPENDED** | **Valid (+45d)** | 🔴 **`DENIED`** | Suspended RC status triggers safety rejection; test Guard Override with code `SUPER88`. |
| **`DL01AB1234`** | `VEND-BLACKLIST-99` (Defunct Roadways) | **INACTIVE** | **Expired (-90d)** | 🔴 **`DENIED`** | Multiple violations: Inactive RC + Expired PUC + Blacklisted Vendor. |

---

## 🚀 5. Getting Started (Running Locally)

### Option A: Using Docker Compose (Recommended)

1. Clone or navigate to the directory:
   ```bash
   cd VizagSteel
   ```

2. Launch all services with Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Access the endpoints:
   - **Frontend Guard Console**: [http://localhost:3000](http://localhost:3000)
   - **FastAPI Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Backend Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### Option B: Running Bare-Metal / Local Dev

#### 1. Backend (FastAPI):
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend (React + Vite):
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ☁️ 6. Connecting to Supabase Cloud

1. In your [Supabase Dashboard](https://app.supabase.com), create a new project.
2. Open the **SQL Editor** and paste the contents of `database/schema.sql` and `database/seed.sql`, then click **Run**.
3. In `backend/.env` (or root `.env`), set:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-or-service-role-key
   ```
4. Restart the backend. The backend will automatically detect the Supabase connection and stream audit logs directly to your Supabase PostgreSQL database.

---

## 🔒 7. Security & Guard Audit Safeguards
- **Tamper-Proof Audit Logging**: Every Surepass API response is preserved verbatim in `raw_surepass_payload` (JSONB) for statutory inspection.
- **Supervisor Authorization Pin**: Guarantees guards cannot unilaterally override safety violations without manager clearance (`SUPER88`).
- **Row Level Security (RLS)**: Pre-configured RLS policies on Supabase ensure secure access control.
