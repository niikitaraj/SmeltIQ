import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Keyboard,
  History,
  ShieldAlert,
  BookOpen,
  LogOut,
  Factory,
  Radio,
  ChevronDown,
  Menu,
  X,
  User,
  ShieldCheck,
  Building2,
  Clock
} from 'lucide-react';
import { UserProfile } from '../types';

export type NavigationPath =
  | '/dashboard'
  | '/manual-entry'
  | '/logs'
  | '/watchlist'
  | '/safety-sop';

export interface SidebarProps {
  currentPath: NavigationPath;
  onNavigate: (path: NavigationPath) => void;
  currentUser: UserProfile;
  activeGate: string;
  onGateChange: (gate: string) => void;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onToggleMobile?: () => void;
}

export const GATE_OPTIONS = [
  'Gate 01 - North Material Entrance',
  'Gate 02 - Inbound Weighbridge',
  'Gate 03 - Finished Steel Exit'
];

/**
 * High-visibility, touch-friendly Hamburger Button in Cruip Simple Light Theme
 * Opens and hides navigation on click
 */
export const MobileMenuButton: React.FC<{
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}> = ({ isOpen, onClick, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-2.5 sm:px-3 sm:py-2 rounded-xl border shadow-xs transition-all flex items-center space-x-2 min-h-[44px] min-w-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500/30 active:scale-95 ${
      isOpen
        ? 'bg-blue-50 border-blue-300 text-blue-600'
        : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
    } ${className}`}
    aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
    aria-expanded={isOpen}
    title="Toggle navigation menu (Click to Open or Hide)"
  >
    {isOpen ? (
      <X className="w-5 h-5 stroke-[2.3] text-blue-600" />
    ) : (
      <Menu className="w-5 h-5 stroke-[2.3] text-slate-700" />
    )}
    <span className="text-xs font-bold tracking-wide uppercase font-mono hidden sm:inline">
      {isOpen ? 'CLOSE' : 'MENU'}
    </span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  currentUser,
  activeGate,
  onGateChange,
  onLogout,
  isOpenMobile,
  onCloseMobile,
  onToggleMobile
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  
  // Controlled or uncontrolled mobile drawer state
  const isDrawerOpen = isOpenMobile !== undefined ? isOpenMobile : internalIsOpen;
  const closeDrawer = () => {
    if (onCloseMobile) {
      onCloseMobile();
    } else {
      setInternalIsOpen(false);
    }
  };

  // Keyboard accessibility: ESC key dismisses drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Lock body scroll on small devices when drawer is active
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  const navItems = [
    {
      path: '/dashboard' as NavigationPath,
      label: 'Live Gate Dashboard',
      icon: LayoutDashboard,
      badge: 'LIVE'
    },
    {
      path: '/manual-entry' as NavigationPath,
      label: 'Manual Plate Entry',
      icon: Keyboard,
      badge: 'RUGGED'
    },
    {
      path: '/logs' as NavigationPath,
      label: 'Gate Movement Logs',
      icon: History
    },
    {
      path: '/watchlist' as NavigationPath,
      label: 'Watchlist & Blacklist',
      icon: ShieldAlert,
      badge: 'SECURITY'
    },
    {
      path: '/safety-sop' as NavigationPath,
      label: 'Plant Safety SOP & Help',
      icon: BookOpen
    }
  ];

  const handleNavClick = (path: NavigationPath) => {
    onNavigate(path);
    closeDrawer();
  };

  const isSupervisor =
    currentUser.role === 'PLANT_SUPERVISOR' || currentUser.role === 'ADMIN';

  const userInitials = currentUser.full_name
    ? currentUser.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'OP';

  // Navigation Body Content styled in Cruip Simple Light
  const sidebarBody = (
    <div className="flex flex-col h-full bg-white text-slate-800">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
            <Factory className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                SmeltIQ
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded uppercase font-mono">
                GATE v2.4
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block font-medium">
              Vizag Steel Works Terminal
            </span>
          </div>
        </div>

        {/* Close Button (Drawer Only) */}
        <button
          type="button"
          onClick={closeDrawer}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition active:scale-95 min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation"
          aria-label="Close navigation drawer"
          title="Close navigation drawer"
        >
          <X className="w-5 h-5 stroke-[2.3]" />
        </button>
      </div>

      {/* Operator Context Section */}
      <div className="p-4 border-b border-slate-200 bg-white space-y-3.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Operator Terminal Context
        </div>

        {/* User Profile Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm border shrink-0 ${
              isSupervisor
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            {userInitials}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 truncate mb-0.5">
              {currentUser.full_name || 'Rajesh Kumar'}
            </h4>
            <div className="flex items-center space-x-1.5">
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
                  isSupervisor
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {isSupervisor ? 'Supervisor' : 'Gate Guard'}
              </span>
              <span className="text-[10px] font-mono text-slate-500 truncate">
                {currentUser.employee_id}
              </span>
            </div>
          </div>
        </div>

        {/* Active Post Selector Dropdown */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>Assigned Gate Post</span>
            </span>
            <span className="text-[9px] text-emerald-600 font-bold font-mono">ACTIVE POST</span>
          </label>

          <div className="relative">
            <select
              value={activeGate}
              onChange={(e) => onGateChange(e.target.value)}
              className="w-full min-h-[42px] bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 pr-9 text-xs font-semibold text-blue-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition appearance-none cursor-pointer touch-manipulation"
            >
              {GATE_OPTIONS.map((gate) => (
                <option key={gate} value={gate} className="bg-white text-slate-800">
                  {gate}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Navigation Menu Items */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto" aria-label="Terminal Navigation">
        <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation Menu
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavClick(item.path)}
              className={`w-full min-h-[46px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group touch-manipulation active:scale-[0.99] ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'
                  }`}
                />
                <span className="text-xs sm:text-sm">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-blue-100 text-blue-800'
                      : item.badge === 'SECURITY'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : item.badge === 'RUGGED'
                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Status & Logout */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-2">
        <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between shadow-xs">
          <span className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Surepass RTO v2</span>
          </span>
          <span className="font-mono text-[10px] text-blue-600 font-bold">ONLINE</span>
        </div>

        <button
          type="button"
          onClick={() => {
            closeDrawer();
            onLogout();
          }}
          className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all group active:scale-[0.98] touch-manipulation"
          title="Clear session and sign out"
        >
          <div className="flex items-center space-x-2.5">
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Sign Out Session</span>
          </div>
          <span className="text-[10px] text-rose-500 font-mono font-semibold">LOGOUT</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Left Sidebar (lg and above) */}
      <aside className="hidden lg:flex w-72 xl:w-80 h-screen sticky top-0 flex-col z-40 shrink-0 border-r border-slate-200 shadow-xs bg-white">
        {sidebarBody}
      </aside>

      {/* 2. Slide-Out Drawer Navigation (Triggered by Hamburger Menu Button) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50">
          {/* Animated Backdrop Overlay: Clicking hides the drawer */}
          <div
            onClick={closeDrawer}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
            aria-hidden="true"
          />

          {/* Slide-out Drawer Panel */}
          <aside
            className="fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] z-50 shadow-2xl bg-white border-r border-slate-200 transform transition-transform duration-300 ease-out"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
          >
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
};
