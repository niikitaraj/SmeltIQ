import React, { useState } from 'react';
import {
  KeyRound,
  AlertTriangle,
  X,
  CheckCircle2,
  Lock,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { ComplianceDecision } from '../types';

interface OverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  decision: ComplianceDecision;
  guardId: string;
  onOverrideSuccess: (updatedDecision: ComplianceDecision) => void;
}

export const OverrideModal: React.FC<OverrideModalProps> = ({
  isOpen,
  onClose,
  decision,
  guardId,
  onOverrideSuccess
}) => {
  const [supervisorCode, setSupervisorCode] = useState<string>('SUPER88');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorCode.trim()) {
      setErrorMsg('Supervisor authorization code is mandatory.');
      return;
    }
    if (overrideReason.trim().length < 5) {
      setErrorMsg('Please provide a descriptive justification (min 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const resp = await api.submitOverride({
        movement_id: decision.movement_id,
        guard_id: guardId,
        supervisor_code: supervisorCode.trim(),
        override_reason: overrideReason.trim()
      });

      // Update decision state in parent
      const updated: ComplianceDecision = {
        ...decision,
        compliance_status: 'OVERRIDDEN',
        rejection_reasons: [
          ...decision.rejection_reasons,
          `[OVERRIDE APPLIED]: ${overrideReason.trim()} (Authorized: ${resp.supervisor_code})`
        ]
      };

      onOverrideSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Override authorization rejected.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-950/80 to-slate-900 border-b border-amber-800/40 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Guard Security Override Request
              </h3>
              <p className="text-xs text-amber-400/90 font-medium">
                Mandatory Supervisory Authorization Required
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Target Vehicle Banner */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Vehicle Plate
              </span>
              <span className="font-mono font-bold text-sm text-sky-400">
                {decision.vehicle_number}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Vendor
              </span>
              <span className="font-medium text-slate-200">
                {decision.vendor_code}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Current Status
              </span>
              <span className="font-bold text-rose-400">
                DENIED
              </span>
            </div>
          </div>

          {/* Supervisor Approval Code */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Supervisor Authorization Code / PIN</span>
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={supervisorCode}
              onChange={(e) => setSupervisorCode(e.target.value.toUpperCase())}
              placeholder="e.g. SUPER88 or SUP-9901"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-amber-400 uppercase placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              required
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Default demo authorization code is <code className="text-amber-400 font-mono">SUPER88</code>
            </span>
          </div>

          {/* Mandatory Override Justification */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Mandatory Justification / Safety Rationale</span>
              <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Emergency slag disposal authorized by Shift Incharge Capt. Rao via Plant Radio #3..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              required
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Logged directly into Supabase PostgreSQL audit trail with Guard ID: <code className="text-slate-300 font-mono">{guardId}</code>
            </span>
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center space-x-2 shadow-lg ${
                isSubmitting
                  ? 'bg-slate-800 text-slate-500 cursor-wait'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Override...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Override</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
