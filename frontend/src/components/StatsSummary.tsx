import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Activity, Percent } from 'lucide-react';
import { MovementLogItem } from '../types';

interface StatsSummaryProps {
  movements: MovementLogItem[];
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ movements }) => {
  const total = movements.length;
  const allowed = movements.filter((m) => m.compliance_status === 'ALLOWED').length;
  const denied = movements.filter((m) => m.compliance_status === 'DENIED').length;
  const overridden = movements.filter((m) => m.compliance_status === 'OVERRIDDEN').length;

  const complianceRate = total > 0 ? ((allowed / total) * 100).toFixed(0) : '100';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Total Scans */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block">
            Total Scans
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
            {total}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
          <Activity className="w-5 h-5" />
        </div>
      </div>

      {/* Allowed */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-emerald-400 uppercase block">
            Passed (Allowed)
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {allowed}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>

      {/* Denied */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-rose-400 uppercase block">
            Violations (Denied)
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-rose-400">
            {denied}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <ShieldAlert className="w-5 h-5" />
        </div>
      </div>

      {/* Overridden */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-amber-400 uppercase block">
            Overridden
          </span>
          <div className="flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
              {overridden}
            </span>
            <span className="text-[10px] text-slate-500">
              ({complianceRate}% rate)
            </span>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
