import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  User,
  Truck,
  FileText,
  ChevronDown,
  ChevronUp,
  FileCode,
  ShieldCheck,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { ComplianceDecision } from '../types';

interface ComplianceCardProps {
  decision: ComplianceDecision;
  onOpenOverrideModal: () => void;
}

export const ComplianceCard: React.FC<ComplianceCardProps> = ({
  decision,
  onOpenOverrideModal
}) => {
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  const isAllowed = decision.compliance_status === 'ALLOWED';
  const isDenied = decision.compliance_status === 'DENIED';
  const isOverridden = decision.compliance_status === 'OVERRIDDEN';

  // Format PUC Expiration badge
  const renderPUCBadge = () => {
    if (!decision.puc_valid_until) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          NOT ON FILE / INVALID
        </span>
      );
    }

    const pucDate = new Date(decision.puc_valid_until);
    const today = new Date();
    const diffTime = pucDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          VALID ({diffDays} days remaining)
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          EXPIRED ({Math.abs(diffDays)} days overdue)
        </span>
      );
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-2xl relative ${
        isAllowed
          ? 'bg-slate-900/90 border-emerald-500/50 glow-emerald'
          : isOverridden
          ? 'bg-slate-900/90 border-amber-500/50 glow-amber'
          : 'bg-slate-900/90 border-rose-500/50 glow-rose'
      }`}
    >
      {/* Top Banner Status Header */}
      <div
        className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isAllowed
            ? 'bg-gradient-to-r from-emerald-950/80 to-teal-950/60 border-b border-emerald-800/40'
            : isOverridden
            ? 'bg-gradient-to-r from-amber-950/80 to-yellow-950/60 border-b border-amber-800/40'
            : 'bg-gradient-to-r from-rose-950/80 to-red-950/60 border-b border-rose-800/40'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
              isAllowed
                ? 'bg-emerald-500 text-slate-950'
                : isOverridden
                ? 'bg-amber-500 text-slate-950'
                : 'bg-rose-500 text-white'
            }`}
          >
            {isAllowed && <CheckCircle2 className="w-7 h-7" />}
            {isOverridden && <AlertTriangle className="w-7 h-7" />}
            {isDenied && <XCircle className="w-7 h-7" />}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-lg sm:text-xl font-extrabold tracking-wider uppercase font-mono ${
                  isAllowed
                    ? 'text-emerald-400'
                    : isOverridden
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {decision.compliance_status === 'ALLOWED' && 'ENTRY ALLOWED'}
                {decision.compliance_status === 'DENIED' && 'ENTRY DENIED'}
                {decision.compliance_status === 'OVERRIDDEN' && 'ENTRY OVERRIDDEN'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 font-mono">
                {decision.vehicle_number}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isAllowed && 'Vehicle verified against all statutory & logistics safety guidelines.'}
              {isDenied && 'Violation detected: Entry strictly restricted per plant safety policy.'}
              {isOverridden && 'Authorized by Gate Supervisor manual safety override.'}
            </p>
          </div>
        </div>

        {/* Override trigger button for DENIED entries */}
        {isDenied && (
          <button
            onClick={onOpenOverrideModal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20 active:scale-[0.98]"
          >
            <KeyRound className="w-4 h-4" />
            <span>Guard Override</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Itemized Rejection Grounds (Shown when DENIED) */}
        {isDenied && decision.rejection_reasons.length > 0 && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4">
            <div className="flex items-center space-x-2 text-rose-300 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Itemized Statutory Violations ({decision.rejection_reasons.length})</span>
            </div>
            <ul className="space-y-1.5">
              {decision.rejection_reasons.map((reason, idx) => (
                <li
                  key={idx}
                  className="flex items-start space-x-2 text-xs text-rose-200/90 font-medium"
                >
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Parsed Surepass & Statutory Data Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {/* Owner Name */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-medium uppercase mb-1">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Registered RC Owner</span>
            </div>
            <div className="font-semibold text-sm text-slate-200 truncate">
              {decision.owner_name || 'NOT DETECTED'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Surepass Live Registry</div>
          </div>

          {/* Vehicle RC Status */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-medium uppercase mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vehicle RC Status</span>
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold font-mono tracking-wider ${
                  decision.rc_status.toUpperCase() === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {decision.rc_status.toUpperCase()}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Rule 1: ACTIVE Mandate</div>
          </div>

          {/* PUC Certificate Expiry Date & Status */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-medium uppercase mb-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>PUC Certificate Validity</span>
            </div>
            <div className="text-xs font-mono font-semibold text-slate-200">
              {decision.puc_valid_until || 'NO PUC RECORD'}
            </div>
            <div className="mt-1">{renderPUCBadge()}</div>
          </div>

          {/* Logistics Vendor Match */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-medium uppercase mb-1">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              <span>Assigned Vendor</span>
            </div>
            <div className="font-semibold text-xs text-slate-200 truncate">
              {decision.vendor_name || decision.vendor_code}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              Code: {decision.vendor_code}
            </div>
          </div>

          {/* Vehicle Class & Category */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-medium uppercase mb-1">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Vehicle Class</span>
            </div>
            <div className="font-semibold text-xs text-slate-200 truncate">
              {decision.vehicle_class || 'Heavy Commercial'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Commercial Goods Carrier</div>
          </div>

          {/* Audit Timestamp & ID */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-medium uppercase mb-1">
              <FileCode className="w-3.5 h-3.5 text-teal-400" />
              <span>Movement Audit Log ID</span>
            </div>
            <div className="font-mono text-xs text-sky-300 truncate" title={decision.movement_id}>
              {decision.movement_id}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {new Date(decision.timestamp).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Collapsible Raw Surepass Audit Payload */}
        <div className="border-t border-slate-800/80 pt-3">
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 py-1 transition"
          >
            <span className="flex items-center space-x-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>Raw Surepass JSON Audit Payload (Supabase raw_surepass_payload)</span>
            </span>
            {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showRawJson && (
            <div className="mt-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800 overflow-x-auto max-h-60 text-[11px] font-mono text-emerald-400">
              <pre>{JSON.stringify(decision.raw_surepass_payload, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
