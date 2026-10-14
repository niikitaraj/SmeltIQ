import React, { useState, useEffect } from 'react';
import {
  Truck,
  Building2,
  ShieldAlert,
  ArrowRightCircle,
  FileCheck2,
  CheckCircle2,
  Radio,
  UserCheck
} from 'lucide-react';
import { Vendor, MovementType } from '../types';

interface VerificationFormProps {
  vehicleNumber: string;
  onVehicleNumberChange: (val: string) => void;
  vendors: Vendor[];
  selectedVendorCode: string;
  onVendorChange: (val: string) => void;
  gateId: string;
  onGateIdChange: (val: string) => void;
  guardId: string;
  onGuardIdChange: (val: string) => void;
  movementType: MovementType;
  onMovementTypeChange: (val: MovementType) => void;
  onVerifySubmit: () => void;
  isLoading: boolean;
  ocrConfidence?: number;
}

export const VerificationForm: React.FC<VerificationFormProps> = ({
  vehicleNumber,
  onVehicleNumberChange,
  vendors,
  selectedVendorCode,
  onVendorChange,
  gateId,
  onGateIdChange,
  guardId,
  onGuardIdChange,
  movementType,
  onMovementTypeChange,
  onVerifySubmit,
  isLoading,
  ocrConfidence
}) => {
  const [inputError, setInputError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) {
      setInputError('Please enter or capture a vehicle license plate.');
      return;
    }
    if (!selectedVendorCode) {
      setInputError('Please select the expected logistics vendor.');
      return;
    }
    setInputError(null);
    onVerifySubmit();
  };

  const selectedVendor = vendors.find((v) => v.vendor_code === selectedVendorCode);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
          <Truck className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
          2. Vehicle Entry Verification Parameters
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Vehicle Registration Number */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <span>Vehicle Registration Plate</span>
              <span className="text-rose-400">*</span>
            </label>
            {ocrConfidence !== undefined && (
              <span className="text-[11px] text-emerald-400 font-mono">
                OCR Matched ({ocrConfidence.toFixed(1)}%)
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => {
                onVehicleNumberChange(e.target.value.toUpperCase());
                if (inputError) setInputError(null);
              }}
              placeholder="e.g. AP31TJ9988"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-base sm:text-lg font-mono font-bold tracking-widest text-sky-400 uppercase placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition shadow-inner"
              required
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-slate-800/80 text-[10px] font-mono text-slate-400 border border-slate-700">
              IND
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Auto-populated from optical scan; fully editable by guard.
          </p>
        </div>

        {/* Vendor Selector Dropdown */}
        <div>
          <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5 mb-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Expected Logistics Vendor</span>
            <span className="text-rose-400">*</span>
          </label>

          <select
            value={selectedVendorCode}
            onChange={(e) => {
              onVendorChange(e.target.value);
              if (inputError) setInputError(null);
            }}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition shadow-inner"
            required
          >
            <option value="" disabled>-- Select Authorized Logistics Vendor --</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.vendor_code}>
                {v.vendor_name} ({v.vendor_code}) {!v.is_active ? '⚠️ [SUSPENDED]' : ''}
              </option>
            ))}
          </select>

          {selectedVendor && !selectedVendor.is_active && (
            <div className="mt-1.5 flex items-center space-x-1.5 text-xs text-rose-400 bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-800/40">
              <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Warning: This vendor is flagged as INACTIVE in master records.</span>
            </div>
          )}
        </div>

        {/* Movement Direction & Gate Terminal Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Movement Direction */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Movement Direction
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => onMovementTypeChange('ENTRY')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition flex items-center justify-center space-x-1.5 ${
                  movementType === 'ENTRY'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>INBOUND (ENTRY)</span>
              </button>
              <button
                type="button"
                onClick={() => onMovementTypeChange('EXIT')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition flex items-center justify-center space-x-1.5 ${
                  movementType === 'EXIT'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>OUTBOUND (EXIT)</span>
              </button>
            </div>
          </div>

          {/* Gate Terminal Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Gate Terminal Station
            </label>
            <select
              value={gateId}
              onChange={(e) => onGateIdChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              <option value="GATE-NORTH-01">Gate North-01 (Heavy Inbound)</option>
              <option value="GATE-EAST-02">Gate East-02 (Slag & Minerals)</option>
              <option value="GATE-SOUTH-03">Gate South-03 (Finished Steel Outbound)</option>
              <option value="GATE-WEST-04">Gate West-04 (General Supply)</option>
            </select>
          </div>
        </div>

        {/* Guard ID */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="flex items-center space-x-1">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Logged Security Guard:</span>
          </span>
          <span className="font-mono font-medium text-slate-300">{guardId}</span>
        </div>

        {/* Input Error Message */}
        {inputError && (
          <div className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{inputError}</span>
          </div>
        )}

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm tracking-wider uppercase transition flex items-center justify-center space-x-2 shadow-xl ${
            isLoading
              ? 'bg-slate-800 text-slate-500 cursor-wait'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 active:scale-[0.99]'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verifying Statutory Rules via Surepass...</span>
            </>
          ) : (
            <>
              <FileCheck2 className="w-4 h-4" />
              <span>Verify Statutory Compliance</span>
              <ArrowRightCircle className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
