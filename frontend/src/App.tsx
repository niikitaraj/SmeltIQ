import React, { useState, useEffect } from 'react';
import { Sidebar, NavigationPath, GATE_OPTIONS, MobileMenuButton } from './components/Sidebar';
import { LiveDashboardPage } from './pages/LiveDashboardPage';
import { ManualEntryPage } from './pages/ManualEntryPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { SafetySopPage } from './pages/SafetySopPage';
import { MovementHistory } from './components/MovementHistory';
import { OverrideModal } from './components/OverrideModal';
import { SupervisorDesk } from './components/SupervisorDesk';
import { AuthPage } from './pages/AuthPage';
import { api } from './services/api';
import {
  Vendor,
  ComplianceDecision,
  MovementLogItem,
  MovementType,
  UserProfile,
  BlacklistEntry
} from './types';
import {
  ShieldAlert,
  SlidersHorizontal,
  Clock,
  Radio,
  FileSpreadsheet
} from 'lucide-react';

export const App: React.FC = () => {
  // Master User Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('smeltiq_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Client-Side Routing State
  const [currentPath, setCurrentPath] = useState<NavigationPath>(() => {
    const p = window.location.pathname as NavigationPath;
    const validPaths: NavigationPath[] = [
      '/dashboard',
      '/manual-entry',
      '/logs',
      '/watchlist',
      '/safety-sop'
    ];
    return validPaths.includes(p) ? p : '/dashboard';
  });

  // Master Gate Configuration
  const [activeGate, setActiveGate] = useState<string>(() => {
    const saved = localStorage.getItem('smeltiq_active_gate');
    return saved || GATE_OPTIONS[0];
  });

  const [guardId, setGuardId] = useState<string>('GUARD-8812');

  // Master Data & Remote State
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [movements, setMovements] = useState<MovementLogItem[]>([]);
  const [activeDecision, setActiveDecision] = useState<ComplianceDecision | null>(null);

  // Blacklist / Watchlist State with Local Storage Persistence
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>(() => {
    const saved = localStorage.getItem('smeltiq_blacklist');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // use default
      }
    }
    return [
      {
        id: 'blk-001',
        vehicle_number: 'DL01AB1234',
        vendor_name: 'Defunct Southern Roadways (Blacklisted)',
        blacklisted_reason: 'Tampered e-way bill & unapproved industrial scrap diversion incident.',
        flagged_by: 'SUPER88',
        flagged_date: '2026-09-15'
      },
      {
        id: 'blk-002',
        vehicle_number: 'AP31BL9999',
        vendor_name: 'Apex Ore & Minerals Haulage Ltd',
        blacklisted_reason: 'Slag spillage on heavy transit haulage lane; repeated axle overload.',
        flagged_by: 'ADMIN-01',
        flagged_date: '2026-10-02'
      },
      {
        id: 'blk-003',
        vehicle_number: 'OD02XX8811',
        vendor_name: 'Coastal Freight Carriers',
        blacklisted_reason: 'Fake driver identity credentials & refusal to wear mandatory safety PPE.',
        flagged_by: 'GUARD-8812',
        flagged_date: '2026-10-08'
      }
    ];
  });

  // Modals & UX State
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [isSupervisorDeskOpen, setIsSupervisorDeskOpen] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Synchronize browser history / URL path
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname as NavigationPath;
      const validPaths: NavigationPath[] = [
        '/dashboard',
        '/manual-entry',
        '/logs',
        '/watchlist',
        '/safety-sop'
      ];
      if (validPaths.includes(p)) {
        setCurrentPath(p);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    }, 1000);
    setCurrentTime(
      new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    );
    return () => clearInterval(timer);
  }, []);

  // Save blacklist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('smeltiq_blacklist', JSON.stringify(blacklist));
    } catch (e) {
      console.warn('Failed to save blacklist:', e);
    }
  }, [blacklist]);

  // Load Initial Master Data (Vendors & Movements)
  useEffect(() => {
    if (currentUser) {
      loadInitialData();
      if (currentUser.employee_id) {
        setGuardId(currentUser.employee_id);
      }
    }
  }, [currentUser]);

  const loadInitialData = async () => {
    try {
      const vendorList = await api.getVendors(false);
      setVendors(vendorList);
    } catch {
      const demoVendors: Vendor[] = [
        { id: '1', vendor_code: 'VEND-TATALOG-01', vendor_name: 'Tata Steel Supply Chain & Freight Logistics', is_active: true },
        { id: '2', vendor_code: 'VEND-JINDAL-02', vendor_name: 'Jindal Heavy Transporters & Bulk Cargo Pvt Ltd', is_active: true },
        { id: '3', vendor_code: 'VEND-VIZAG-03', vendor_name: 'Vizag Coastal Freight Carriers', is_active: true },
        { id: '4', vendor_code: 'VEND-APEX-04', vendor_name: 'Apex Ore & Minerals Haulage Ltd', is_active: true },
        { id: '5', vendor_code: 'VEND-BLACKLIST-99', vendor_name: 'Defunct Southern Roadways (Blacklisted)', is_active: false }
      ];
      setVendors(demoVendors);
    }

    refreshMovements();
  };

  const refreshMovements = async () => {
    try {
      const data = await api.getRecentMovements(50);
      setMovements(data);
    } catch {
      // Keep seeded fallback movements
      const fallback: MovementLogItem[] = [
        {
          id: 'mov-101',
          gate_id: 'Gate 01 - North Material Entrance',
          movement_type: 'ENTRY',
          vehicle_number: 'AP31TJ9988',
          ocr_confidence: 97.4,
          owner_name: 'RAMESH CHANDRA SHARMA',
          vendor_code: 'VEND-TATALOG-01',
          vendor_name: 'Tata Steel Supply Chain & Freight Logistics',
          rc_status: 'ACTIVE',
          puc_valid_until: '2027-04-15',
          compliance_status: 'ALLOWED',
          rejection_reasons: [],
          guard_id: 'GUARD-8812',
          created_at: new Date(Date.now() - 3600000 * 2.2).toISOString()
        },
        {
          id: 'mov-102',
          gate_id: 'Gate 01 - North Material Entrance',
          movement_type: 'ENTRY',
          vehicle_number: 'MH12AB5678',
          ocr_confidence: 93.1,
          owner_name: 'SURESH TRUCKING CO.',
          vendor_code: 'VEND-JINDAL-02',
          vendor_name: 'Jindal Heavy Transporters & Bulk Cargo Pvt Ltd',
          rc_status: 'ACTIVE',
          puc_valid_until: '2026-09-30',
          compliance_status: 'DENIED',
          rejection_reasons: ['Pollution Under Control (PUC) certificate expired on 2026-09-30.'],
          guard_id: 'GUARD-8812',
          created_at: new Date(Date.now() - 3600000 * 1.5).toISOString()
        },
        {
          id: 'mov-103',
          gate_id: 'Gate 02 - Inbound Weighbridge',
          movement_type: 'ENTRY',
          vehicle_number: 'AP31XX0001',
          ocr_confidence: 89.6,
          owner_name: 'VIJAYAWADA ROADWAYS LTD',
          vendor_code: 'VEND-VIZAG-03',
          vendor_name: 'Vizag Coastal Freight Carriers',
          rc_status: 'SUSPENDED',
          puc_valid_until: '2027-01-10',
          compliance_status: 'OVERRIDDEN',
          rejection_reasons: ['Vehicle Registration Certificate (RC) status is SUSPENDED (Rule 1 violation).'],
          override_reason: 'Emergency raw flux delivery authorized by Shift Supervisor Capt. Rao',
          guard_id: 'GUARD-1042',
          created_at: new Date(Date.now() - 3600000 * 0.9).toISOString()
        }
      ];
      setMovements(fallback);
    }
  };

  // Check if a vehicle is in the active blacklist
  const isBlacklistedVehicle = (plate: string): boolean => {
    const clean = plate.trim().toUpperCase().replace(/\s+/g, '');
    return blacklist.some(
      (b) => b.vehicle_number.toUpperCase().replace(/\s+/g, '') === clean
    );
  };

  // Add Blacklist Entry
  const handleAddBlacklist = (entry: Omit<BlacklistEntry, 'id' | 'flagged_date'>) => {
    const newItem: BlacklistEntry = {
      ...entry,
      id: 'blk-' + Date.now(),
      flagged_date: new Date().toISOString()
    };
    setBlacklist((prev) => [newItem, ...prev]);
  };

  // Remove Blacklist Entry
  const handleRemoveBlacklist = (id: string) => {
    setBlacklist((prev) => prev.filter((b) => b.id !== id));
  };

  // Navigation Handler
  const handleNavigate = (path: NavigationPath) => {
    setCurrentPath(path);
    try {
      window.history.pushState(null, '', path);
    } catch {
      // file:// or unsupported history fallback
    }
  };

  // Active Post / Gate Change Handler
  const handleGateChange = (gate: string) => {
    setActiveGate(gate);
    try {
      localStorage.setItem('smeltiq_active_gate', gate);
    } catch (e) {
      console.warn('Failed to save gate:', e);
    }
  };

  // Auth Success Handler: Called by AuthPage upon Login or Sign Up
  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('smeltiq_user', JSON.stringify(user));
    setGuardId(user.employee_id || 'GUARD-8812');
    if (user.assigned_gate_id && GATE_OPTIONS.includes(user.assigned_gate_id)) {
      handleGateChange(user.assigned_gate_id);
    }
    handleNavigate('/dashboard');
  };

  // Sign Out Handler: Clears session and returns to AuthPage
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('smeltiq_user');
    setActiveDecision(null);
  };

  // Handle successful Guard Override
  const handleOverrideSuccess = (updatedDecision: ComplianceDecision) => {
    setActiveDecision(updatedDecision);
    setMovements((prev) =>
      prev.map((m) =>
        m.id === updatedDecision.movement_id || m.vehicle_number === updatedDecision.vehicle_number
          ? {
              ...m,
              compliance_status: 'OVERRIDDEN',
              override_reason: updatedDecision.rejection_reasons.slice(-1)[0]
            }
          : m
      )
    );
    setIsOverrideModalOpen(false);
  };

  // Export CSV of movement logs
  const handleExportCSV = () => {
    if (!movements || movements.length === 0) return;
    const headers = ['Time', 'Vehicle Number', 'Carrier', 'Gate', 'Status', 'Guard', 'Audit Details'];
    const rows = movements.map((m) => [
      new Date(m.created_at).toLocaleString('en-IN'),
      m.vehicle_number,
      `"${m.vendor_name || m.vendor_code || ''}"`,
      `"${m.gate_id}"`,
      m.compliance_status,
      m.guard_id,
      `"${m.override_reason || (m.rejection_reasons && m.rejection_reasons.length > 0 ? m.rejection_reasons[0] : 'All Statutory Rules Passed')}"`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SmeltIQ_Gate_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If user is not authenticated, render dedicated Authentication Page
  if (!currentUser) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  const isSupervisor =
    currentUser.role === 'PLANT_SUPERVISOR' || currentUser.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* 1. Sticky Navigation Sidebar with Operator Context */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        activeGate={activeGate}
        onGateChange={handleGateChange}
        onLogout={handleLogout}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        onToggleMobile={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar with High-Visibility Touch-Friendly Hamburger Menu */}
        <header className="bg-white/80 border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 sticky top-0 z-30 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            {/* High-visibility touch-friendly hamburger menu button (Click to Open or Hide) */}
            <MobileMenuButton
              isOpen={isMobileNavOpen}
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            />

            <div className="flex items-center space-x-2 text-xs">
              <div className="flex items-center space-x-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-bold text-emerald-800 hidden xs:inline">Terminal Online</span>
              </div>
              <span className="text-slate-300 hidden md:inline">•</span>
              <span className="text-slate-600 font-medium hidden md:inline">
                Post: <strong className="text-blue-600 font-mono">{activeGate.split(' - ')[0]}</strong>
              </span>
              <span className="text-slate-300 hidden lg:inline">•</span>
              <span className="text-slate-500 text-[11px] hidden lg:inline">Surepass RC/PUC v2 Live</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
            {isSupervisor && (
              <button
                onClick={() => setIsSupervisorDeskOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold flex items-center space-x-1.5 transition shadow-xs active:scale-95"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Supervisor Desk</span>
                <span className="sm:hidden">Desk</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold shadow-xs transition"
              title="Export Shift Audit Trail as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] sm:text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentTime}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Router Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Global Alert Banner */}
          {globalError && (
            <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <span>{globalError}</span>
              </div>
              <button
                onClick={() => setGlobalError(null)}
                className="text-rose-400 hover:text-white font-bold ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* PAGE 1: Live Gate Dashboard */}
          {currentPath === '/dashboard' && (
            <LiveDashboardPage
              activeGate={activeGate}
              guardId={guardId}
              movements={movements}
              vendors={vendors}
              activeDecision={activeDecision}
              onVerifyDecision={setActiveDecision}
              onOpenOverride={() => setIsOverrideModalOpen(true)}
              onRefreshMovements={refreshMovements}
              isBlacklistedVehicle={isBlacklistedVehicle}
            />
          )}

          {/* PAGE 2: Manual Number Plate Entry Page */}
          {currentPath === '/manual-entry' && (
            <ManualEntryPage
              activeGate={activeGate}
              guardId={guardId}
              vendors={vendors}
              onVerifyDecision={setActiveDecision}
              onOpenOverride={() => setIsOverrideModalOpen(true)}
              isBlacklistedVehicle={isBlacklistedVehicle}
            />
          )}

          {/* PAGE 3: Gate Movement Logs Page */}
          {currentPath === '/logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                    <Clock className="w-6 h-6 text-sky-400" />
                    <span>Gate Movement Audit Logs</span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Complete statutory audit trail of vehicle entries, exits, violations, and supervisor overrides.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 transition self-start sm:self-auto"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Audit CSV ({movements.length})</span>
                </button>
              </div>

              <MovementHistory
                movements={movements}
                isLoading={false}
                onRefresh={refreshMovements}
              />
            </div>
          )}

          {/* PAGE 4: Watchlist & Blacklist Page */}
          {currentPath === '/watchlist' && (
            <WatchlistPage
              blacklist={blacklist}
              onAddBlacklist={handleAddBlacklist}
              onRemoveBlacklist={handleRemoveBlacklist}
              vendors={vendors}
              guardId={guardId}
            />
          )}

          {/* PAGE 5: Plant Safety SOP & Help Guide */}
          {currentPath === '/safety-sop' && <SafetySopPage />}
        </main>
      </div>

      {/* Supervisor Verbal Override PIN Modal */}
      {isOverrideModalOpen && activeDecision && (
        <OverrideModal
          isOpen={isOverrideModalOpen}
          decision={activeDecision}
          guardId={guardId}
          onClose={() => setIsOverrideModalOpen(false)}
          onSuccess={handleOverrideSuccess}
        />
      )}

      {/* Supervisor Operations Control Desk Modal */}
      {isSupervisorDeskOpen && (
        <SupervisorDesk
          isOpen={isSupervisorDeskOpen}
          currentUser={currentUser}
          vendors={vendors}
          movements={movements}
          onClose={() => setIsSupervisorDeskOpen(false)}
          onToggleVendor={(vendorCode: string) => {
            setVendors((prev) =>
              prev.map((v) =>
                v.vendor_code === vendorCode ? { ...v, is_active: !v.is_active } : v
              )
            );
          }}
        />
      )}
    </div>
  );
};

export default App;
