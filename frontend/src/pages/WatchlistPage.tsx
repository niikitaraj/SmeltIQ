import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Calendar,
  User,
  X,
  FileWarning,
  ShieldCheck
} from 'lucide-react';
import { BlacklistEntry, Vendor } from '../types';

interface WatchlistPageProps {
  blacklist: BlacklistEntry[];
  onAddBlacklist: (entry: Omit<BlacklistEntry, 'id' | 'flagged_date'>) => void;
  onRemoveBlacklist: (id: string) => void;
  vendors: Vendor[];
  guardId: string;
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({
  blacklist,
  onAddBlacklist,
  onRemoveBlacklist,
  vendors,
  guardId
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New Blacklist Entry Form State
  const [newVehicleNumber, setNewVehicleNumber] = useState<string>('');
  const [newVendorName, setNewVendorName] = useState<string>(
    vendors[0]?.vendor_name || 'Defunct Southern Roadways'
  );
  const [newReason, setNewReason] = useState<string>('');
  const [newFlaggedBy, setNewFlaggedBy] = useState<string>(guardId || 'SUPER88');
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered List
  const filteredBlacklist = blacklist.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.vehicle_number.toLowerCase().includes(q) ||
      item.vendor_name.toLowerCase().includes(q) ||
      item.blacklisted_reason.toLowerCase().includes(q) ||
      item.flagged_by.toLowerCase().includes(q)
    );
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPlate = newVehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanPlate) {
      setFormError('Please enter a valid vehicle registration number.');
      return;
    }
    if (!newReason.trim()) {
      setFormError('Please specify the security or safety blacklisting reason.');
      return;
    }

    onAddBlacklist({
      vehicle_number: cleanPlate,
      vendor_name: newVendorName,
      blacklisted_reason: newReason.trim(),
      flagged_by: newFlaggedBy
    });

    setNewVehicleNumber('');
    setNewReason('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <span>Plant Watchlist & Blacklist Registry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Restricted vehicles, repeat safety violators, and revoked contractors barred from entering steel works gates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-900/30 flex items-center space-x-2 transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vehicle to Blacklist</span>
        </button>
      </div>

      {/* Security Advisory Alert */}
      <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-rose-300 block mb-0.5">Automated Gate Rule Enforcement Active</strong>
          Any vehicle registered below will trigger an immediate, non-negotiable statutory denial at all ANPR and manual gate terminals across Vizag Steel Works.
        </div>
      </div>

      {/* Search & Statistics Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by vehicle, vendor, or reason..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-medium focus:outline-none focus:border-rose-500 transition"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-400 self-end sm:self-auto">
          <span>
            Total Flagged: <strong className="text-rose-400 font-mono">{blacklist.length}</strong>
          </span>
          <span>•</span>
          <span>
            Showing: <strong className="text-slate-200 font-mono">{filteredBlacklist.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Watchlist Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl">
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="p-3">Vehicle Number</th>
                <th className="p-3">Associated Carrier</th>
                <th className="p-3">Blacklist Violation Reason</th>
                <th className="p-3">Flagged By</th>
                <th className="p-3">Date Flagged</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredBlacklist.length > 0 ? (
                filteredBlacklist.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-3 font-mono font-extrabold text-rose-400 text-sm whitespace-nowrap">
                      {item.vehicle_number}
                    </td>
                    <td className="p-3 text-slate-300 max-w-[180px] truncate">
                      {item.vendor_name}
                    </td>
                    <td className="p-3 text-slate-200 max-w-[280px]">
                      <div className="flex items-start space-x-1.5">
                        <FileWarning className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                        <span>{item.blacklisted_reason}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {item.flagged_by}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(item.flagged_date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onRemoveBlacklist(item.id)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 transition active:scale-95"
                        title="Remove from Blacklist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                    No blacklisted vehicles match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add to Blacklist Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 p-5 border-b border-rose-800/40 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add Vehicle to Blacklist</h3>
                  <p className="text-[11px] text-slate-400">Bars entry at all plant gates</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Vehicle Registration Number
                </label>
                <input
                  type="text"
                  required
                  value={newVehicleNumber}
                  onChange={(e) =>
                    setNewVehicleNumber(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                    )
                  }
                  placeholder="e.g. DL01AB1234"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 font-mono text-base text-rose-400 uppercase font-black focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Carrier / Transporter
                </label>
                <input
                  type="text"
                  required
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  placeholder="e.g. Defunct Southern Roadways"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 text-xs font-medium focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Blacklist Reason (Statutory / Safety / Security)
                </label>
                <textarea
                  rows={3}
                  required
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="e.g. Repeated PUC violation, fake e-way bill incident, or reckless driving in raw materials yard."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 text-xs font-medium focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Authorizing Security Officer / Badge
                </label>
                <input
                  type="text"
                  required
                  value={newFlaggedBy}
                  onChange={(e) => setNewFlaggedBy(e.target.value.toUpperCase())}
                  placeholder="e.g. SUPER88 or GUARD-8812"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 font-mono text-slate-200 text-xs font-bold focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
                  {formError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-600/30 transition active:scale-95"
                >
                  Enforce Blacklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
