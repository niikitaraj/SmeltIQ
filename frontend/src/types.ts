export type ComplianceStatus = 'ALLOWED' | 'DENIED' | 'OVERRIDDEN';
export type MovementType = 'ENTRY' | 'EXIT';
export type PUCStatus = 'VALID' | 'EXPIRED' | 'NOT_AVAILABLE';
export type PermitStatus = 'VALID' | 'EXPIRED' | 'NOT_AVAILABLE' | 'NOT_APPLICABLE';


export interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  is_active: boolean;
  contact_phone?: string;
  contact_email?: string;
}

export interface OCRResult {
  vehicle_number: string;
  confidence: number;
  raw_text?: string;
  method_used: string;
}

export interface ComplianceDecision {
  movement_id: string;
  vehicle_number: string;
  owner_name?: string;
  vendor_code: string;
  vendor_name?: string;
  rc_status: string;
  puc_valid_until?: string | null;
  puc_status: PUCStatus;
  permit_number?: string | null;
  permit_type?: string | null;
  permit_valid_until?: string | null;
  permit_status?: PermitStatus;
  national_permit_number?: string | null;
  national_permit_upto?: string | null;
  compliance_status: ComplianceStatus;
  rejection_reasons: string[];
  timestamp: string;
  guard_id: string;
  gate_id: string;
  movement_type: MovementType;
  vehicle_class?: string;
  insurance_upto?: string;
  raw_surepass_payload?: Record<string, any>;
  is_cached?: boolean;
  data_source?: string;
}

export interface GuardOverrideRequest {
  movement_id: string;
  guard_id: string;
  supervisor_code: string;
  override_reason: string;
}

export interface GuardOverrideResponse {
  movement_id: string;
  previous_status: string;
  new_status: ComplianceStatus;
  guard_id: string;
  supervisor_code: string;
  override_reason: string;
  overridden_at: string;
  message: string;
}

export interface MovementLogItem {
  id: string;
  gate_id: string;
  movement_type: MovementType;
  vehicle_number: string;
  ocr_confidence?: number;
  owner_name?: string;
  vendor_id?: string;
  vendor_code?: string;
  vendor_name?: string;
  rc_status?: string;
  puc_valid_until?: string | null;
  permit_number?: string | null;
  permit_type?: string | null;
  permit_valid_until?: string | null;
  permit_status?: PermitStatus | string;
  national_permit_number?: string | null;
  national_permit_upto?: string | null;
  compliance_status: ComplianceStatus;
  rejection_reasons: string[];
  guard_id: string;
  override_reason?: string;
  supervisor_code?: string;
  overridden_at?: string;
  created_at: string;
}

export type UserRole = 'GATE_GUARD' | 'PLANT_SUPERVISOR' | 'ADMIN';

export interface UserProfile {
  id: string;
  employee_id: string;
  full_name: string;
  role: UserRole;
  assigned_gate_id?: string;
  is_active: boolean;
  created_at?: string;
}

export interface AuthSession {
  user: UserProfile;
  access_token: string;
  permissions: string[];
  login_time: string;
}

export interface BlacklistEntry {
  id: string;
  vehicle_number: string;
  vendor_name: string;
  blacklisted_reason: string;
  flagged_by: string;
  flagged_date: string;
}

export interface OverrideModalProps {
  isOpen: boolean;
  decision: ComplianceDecision;
  guardId: string;
  onClose: () =&gt; void;
  onSuccess?: (updatedDecision: ComplianceDecision) =&gt; void;
}

export interface SupervisorDeskProps {
  isOpen: boolean;
  currentUser: UserProfile;
  vendors: Vendor[];
  movements: MovementLogItem[];
  onClose: () =&gt; void;
  onToggleVendor?: (vendorCode: string) =&gt; void;
}
