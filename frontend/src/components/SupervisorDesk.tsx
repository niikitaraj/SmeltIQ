import React, { useState } from 'react';
import {
  ShieldAlert,
  Building2,
  Download,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  FileSpreadsheet,
  X,
  Lock,
  Sparkles
} from 'lucide-react';
import { Vendor, MovementLogItem, UserProfile } from '../types';
import { api } from '../services/api';

interface SupervisorDeskProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  vendors: Vendor[];
  onVendorsUpdate: (updatedVendors: Vendor[]) => void;
  movements: MovementLogItem[];
}

export const SupervisorDesk: React.FC<SupervisorDeskProps> = ({
  isOpen,
  onClose,
  currentUser,
  vendors,
  onVendorsUpdate,
  movements
}) => {
  const [updatingCode, setUpdatingCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleVendor = async (vendor: Vendor) => {
    setUpdatingCode(vendor.vendor_code);
    setSuccessMsg(null);
    try {
      const updated = await api.toggleVendorStatus(vendor.vendor_code, !vendor.is_active, 'SUPER88');
      onVendorsUpdate(
        vendors.map((v) => (v.vendor_code === updated.vendor_code ? updated : v))
      );
      setSuccessMsg(
        `Vendor ${vendor.vendor_name} is now ${
          !vendor.is_active ? 'AUTHORIZED (ACTIVE)' : 'SUSPENDED / BLOCKED'
        }`
      );
    } catch {
      // Offline / standalone fallback
      const toggled = !vendor.is_active;
      onVendorsUpdate(
        vendors.map((v) =>
          v.vendor_code === vendor.vendor_code ? { ...v, is_active: toggled } : v
        )
      );
      setSuccessMsg(
        `Local mode: ${vendor.vendor_name} changed to ${
          toggled ? 'ACTIVE' : 'SUSPENDED'
        }`
      );
    } finally {
      setUpdatingCode(null);
    }
  };

  const handleExportCSV = () => {
    if (!movements || movements.length === 0) return;
    const headers = [
      'ID',
      'Gate ID',
      'Movement Type',
      'Vehicle Number',
      'Owner Name',
      'Vendor Code',
      'RC Status',
      'PUC Valid Until',
      'Compliance Status',
      'Guard ID',
      'Supervisor Code',
      'Override Reason',
      'Timestamp'
    ];
    const rows = movements.map((m) => [
      m.id,
      m.gate_id,
      m.movement_type,
      m.vehicle_number,
      `"${m.owner_name || ''}"`,
      m.vendor_code || '',
      m.rc_status || '',
      m.puc_valid_until || '',
      m.compliance_status,
      m.guard_id,
      m.supervisor_code || '',
      `"${m.override_reason || ''}"`,
      m.created_at
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `SmeltIQ_Gate_Audit_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 p-5 border-b border-amber-800/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-100">
                  Supervisor Operations Control Desk
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 uppercase tracking-wider">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logged in as <span className="text-slate-200 font-semibold">{currentUser.full_name}</span> ({currentUser.employee_id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Actions Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-300">
                  Statutory Audit Log Export
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Download all {movements.length} gate movements formatted as CSV
                </div>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-300">
                  Supervisor Authorization Key
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  PIN code for guard verbal overrides: <span className="font-mono text-amber-400 font-bold">SUPER88</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Master Logistics Vendor Governance */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Master Logistics Vendor Governance (Rule 3 Enforcement)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                {vendors.filter((v) => v.is_active).length} of {vendors.length} active
              </span>
            </div>

            <div className="rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80 bg-slate-950">
              {vendors.map((vendor) => (
                <div
                  key={vendor.vendor_code}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-900/50 transition"
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`mt-0.5 w-2 h-2 rounded-full ${
                        vendor.is_active ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center space-x-2">
                        <span>{vendor.vendor_name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                          {vendor.vendor_code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {vendor.contact_phone} • {vendor.contact_email}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleVendor(vendor)}
                    disabled={updatingCode === vendor.vendor_code}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      vendor.is_active
                        ? 'bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300'
                        : 'bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800 text-emerald-300'
                    }`}
                  >
                    {vendor.is_active ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Suspend Access</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Re-Authorize</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Vizag Steel Operations • Compliance Rule Engine v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Close Desk
          </button>
        </div>
      </div>
    </div>
  );
};
