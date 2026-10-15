import {
  Vendor,
  OCRResult,
  ComplianceDecision,
  GuardOverrideRequest,
  GuardOverrideResponse,
  MovementLogItem,
  MovementType,
  UserProfile,
  AuthSession
} from '../types';

/**
 * Dynamic Backend API URL Resolver:
 * Supports VITE_API_BASE_URL, REACT_APP_API_BASE_URL, window runtime config, or relative /api/v1.
 * Normalizes trailing slashes and ensures /api/v1 prefix is correctly attached.
 */
export function resolveApiBaseUrl(): string {
  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_BASE_URL || import.meta.env.REACT_APP_API_BASE_URL)) ||
    (typeof window !== 'undefined' && ((window as any).__SMELTIQ_API_URL__ || (window as any).VITE_API_BASE_URL || (window as any).REACT_APP_API_BASE_URL || localStorage.getItem('smeltiq_api_url'))) ||
    ''
  ).trim().replace(/\/+$/, '');

  if (!envUrl) {
    return '/api/v1';
  }

  return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl}/api/v1`;
}

export const API_BASE = resolveApiBaseUrl();

export const api = {
  // Fetch Logistics Vendors
  async getVendors(onlyActive = true): Promise<Vendor[]> {
    const res = await fetch(`${API_BASE}/vendors?only_active=${onlyActive}`);
    if (!res.ok) {
      throw new Error(`Failed to load vendors: ${res.statusText}`);
    }
    return res.json();
  },

  // OCR Extraction via Base64 Image
  async extractPlateBase64(imageBase64: string, mockPlate?: string): Promise<OCRResult> {
    const res = await fetch(`${API_BASE}/ocr/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: imageBase64,
        mock_plate: mockPlate
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `OCR Extraction failed (${res.status})`);
    }
    return res.json();
  },

  // OCR Extraction via Multipart File
  async extractPlateFile(file: File, mockPlate?: string): Promise<OCRResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (mockPlate) {
      formData.append('mock_plate', mockPlate);
    }

    const res = await fetch(`${API_BASE}/ocr/extract`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `OCR file upload failed (${res.status})`);
    }
    return res.json();
  },

  // Compliance Verification & Surepass Rule Evaluation
  async verifyGateEntry(payload: {
    vehicle_number: string;
    expected_vendor_code: string;
    guard_id: string;
    gate_id: string;
    movement_type: MovementType;
    ocr_confidence?: number;
    force_refresh?: boolean;
  }): Promise<ComplianceDecision> {
    const res = await fetch(`${API_BASE}/gate/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Compliance verification failed (${res.status})`);
    }
    return res.json();
  },

  // Guard Manual Override for Denied Entry
  async submitOverride(payload: GuardOverrideRequest): Promise<GuardOverrideResponse> {
    const res = await fetch(`${API_BASE}/gate/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Override submission failed (${res.status})`);
    }
    return res.json();
  },

  // Movement Audit Logs
  async getRecentMovements(limit = 40): Promise<MovementLogItem[]> {
    const res = await fetch(`${API_BASE}/gate/movements?limit=${limit}`);
    if (!res.ok) {
      throw new Error(`Failed to load movements: ${res.statusText}`);
    }
    return res.json();
  },
  // Check vehicle cache status (0 API Cost)
  async checkVehicleCache(vehicleNumber: string): Promise<{
    cached: boolean;
    vehicle_number: string;
    owner_name?: string;
    rc_status?: string;
    puc_valid_until?: string;
    compliance_status?: string;
    data_source: string;
    api_cost?: number;
  }> {
    const clean = vehicleNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const res = await fetch(`${API_BASE}/gate/cache/${clean}`);
    if (!res.ok) {
      throw new Error(`Failed to check cache: ${res.statusText}`);
    }
    return res.json();
  },


  // Auth: Shift Login for Guard or Supervisor
  async login(
    employeeId: string,
    passwordOrPin: string,
    loginType: 'GUARD_QUICK_SHIFT' | 'SUPERVISOR_CREDENTIALS' = 'GUARD_QUICK_SHIFT',
    assignedGateId = 'GATE-NORTH-01'
  ): Promise<AuthSession> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employeeId,
        password_or_pin: passwordOrPin,
        login_type: loginType,
        assigned_gate_id: assignedGateId
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Login failed: ${res.statusText}`);
    }
    const data = await res.json();
    return {
      user: data.user,
      access_token: data.access_token,
      permissions: data.permissions || [],
      login_time: new Date().toISOString()
    };
  },

  // Auth: List available personnel profiles
  async getProfiles(): Promise<UserProfile[]> {
    const res = await fetch(`${API_BASE}/auth/profiles`);
    if (!res.ok) {
      throw new Error(`Failed to fetch profiles: ${res.statusText}`);
    }
    return res.json();
  },

  // Supervisor: Activate / Suspend Vendor
  async toggleVendorStatus(
    vendorCode: string,
    isActive: boolean,
    supervisorCode = 'SUPER88'
  ): Promise<Vendor> {
    const res = await fetch(`${API_BASE}/auth/vendors/${vendorCode}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'supervisor-code': supervisorCode
      },
      body: JSON.stringify({ is_active: isActive })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update vendor: ${res.statusText}`);
    }
    return res.json();
  },

  // Backend Health check
  async getHealth(): Promise<{ status: string; surepass_mode: string; supabase_connected: boolean }> {
    const rootUrl = API_BASE.replace(/\/api\/v1\/?$/, '');
    const healthUrl = rootUrl ? `${rootUrl}/health` : '/health';
    const res = await fetch(healthUrl);
    if (!res.ok) {
      throw new Error(`Health check failed: ${res.statusText}`);
    }
    return res.json();
  }
};
