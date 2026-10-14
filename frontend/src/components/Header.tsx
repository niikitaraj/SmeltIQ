import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Factory,
  Radio,
  Database,
  Clock,
  User,
  Lock,
  LogOut,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  gateId: string;
  guardId: string;
  isOnline: boolean;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onOpenSupervisorDesk?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gateId,
  guardId,
  isOnline,
  currentUser,
  onLogout,
  onOpenSupervisorDesk
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const role = currentUser?.role || 'GATE_GUARD';
  const isSupervisorOrAdmin = role === 'PLANT_SUPERVISOR' || role === 'ADMIN';

  return (
    <header className="bg-gradient-to-r from-slate-950 via-[#0d1522] to-slate-950 border-b border-slate-800/80 px-4 py-3 sm:px-6 shadow-xl sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/30">
              <Factory className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-sky-100 to-sky-400 bg-clip-text text-transparent">
                SmeltIQ
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-md tracking-wider uppercase">
                Plant Gate v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Vizag Steel Works • Statutory Gate Compliance & ANPR Engine
            </p>
          </div>
        </div>

        {/* Real-time telemetry & Authenticated User Status */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {/* Gate Terminal */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="text-slate-400">Terminal:</span>
            <span className="font-semibold text-slate-200">{gateId}</span>
          </div>

          {/* Active Shift / User Profile Badge */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition ${
              role === 'ADMIN'
                ? 'bg-purple-950/40 border-purple-800/60 text-purple-200'
                : role === 'PLANT_SUPERVISOR'
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                : 'bg-slate-900/90 border-slate-800 text-slate-200'
            }`}
          >
            {isSupervisorOrAdmin ? (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <div className="flex flex-col text-left">
              <span className="font-bold text-xs truncate max-w-[130px]">
                {currentUser?.full_name || guardId}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">
                {role.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Supervisor Control Desk Trigger */}
          {isSupervisorOrAdmin && onOpenSupervisorDesk && (
            <button
              onClick={onOpenSupervisorDesk}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-md shadow-amber-500/20 active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Supervisor Desk</span>
            </button>
          )}

          {/* Sign Out Action Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 transition active:scale-95"
              title="Sign Out from SmeltIQ"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}

          {/* Clock */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-sky-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{time}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

