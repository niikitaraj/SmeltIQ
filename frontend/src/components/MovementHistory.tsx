import React, { useState } from 'react';
import {
  History,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { MovementLogItem, ComplianceStatus } from '../types';

interface MovementHistoryProps {
  movements: MovementLogItem[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const MovementHistory: React.FC<MovementHistoryProps> = ({
  movements,
  onRefresh,
  isLoading
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = movements.filter((m) => {
    const matchesFilter = filterStatus === 'ALL' || m.compliance_status === filterStatus;
    const matchesQuery =
      searchQuery === '' ||
      m.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.vendor_name && m.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.guard_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  const getStatusBadge = (status: ComplianceStatus) => {
    switch (status) {
      case 'ALLOWED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>ALLOWED</span>
          </span>
        );
      case 'DENIED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>DENIED</span>
          </span>
        );
      case 'OVERRIDDEN':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            <span>OVERRIDDEN</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl">
      {/* Table Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
              3. Gate Movement Audit Log
            </h2>
            <p className="text-[11px] text-slate-400">
              Synced with Supabase PostgreSQL <code className="text-sky-400 font-mono">gate_movements</code>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plate / vendor..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 w-36 sm:w-44"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {['ALL', 'ALLOWED', 'DENIED', 'OVERRIDDEN'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition ${
                  filterStatus === st
                    ? 'bg-slate-800 text-sky-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Movement Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Movement Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px] uppercase font-semibold">
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Vehicle Number</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Vendor</th>
              <th className="py-2.5 px-3">Compliance</th>
              <th className="py-2.5 px-3">RC / PUC</th>
              <th className="py-2.5 px-3">Guard</th>
              <th className="py-2.5 px-3">Audit Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  No gate movements matching the current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/30 transition group">
                  {/* Timestamp */}
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {new Date(m.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    <span className="block text-[10px] text-slate-500">
                      {new Date(m.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </td>

                  {/* Vehicle Number */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="font-mono font-bold text-sky-400 text-xs">
                      {m.vehicle_number}
                    </span>
                    {m.ocr_confidence && (
                      <span className="block text-[10px] text-slate-500">
                        Conf: {m.ocr_confidence.toFixed(0)}%
                      </span>
                    )}
                  </td>

                  {/* Movement Direction */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        m.movement_type === 'ENTRY'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {m.movement_type}
                    </span>
                  </td>

                  {/* Vendor */}
                  <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                    <span className="block font-semibold text-xs truncate">
                      {m.vendor_name || m.vendor_code || 'Direct Haulage'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {m.vendor_code}
                    </span>
                  </td>

                  {/* Compliance Status Badge */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {getStatusBadge(m.compliance_status)}
                  </td>

                  {/* RC / PUC details */}
                  <td className="py-2.5 px-3 text-[11px] whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        m.rc_status?.toUpperCase() === 'ACTIVE'
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      RC: {m.rc_status || 'N/A'}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      PUC: {m.puc_valid_until ? m.puc_valid_until : 'Missing'}
                    </span>
                  </td>

                  {/* Guard */}
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {m.guard_id}
                  </td>

                  {/* Audit Details */}
                  <td className="py-2.5 px-3 text-[11px] max-w-xs">
                    {m.compliance_status === 'OVERRIDDEN' ? (
                      <div className="text-amber-300/90 truncate" title={m.override_reason || ''}>
                        <span className="font-semibold text-amber-400">Override: </span>
                        {m.override_reason}
                      </div>
                    ) : m.rejection_reasons && m.rejection_reasons.length > 0 ? (
                      <div className="text-rose-400 truncate" title={m.rejection_reasons.join(', ')}>
                        {m.rejection_reasons[0]}
                      </div>
                    ) : (
                      <span className="text-emerald-400/80">All Rule Checks Passed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
