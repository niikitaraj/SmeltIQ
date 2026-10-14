import React, { useState } from 'react';
import {
  Factory,
  ShieldCheck,
  Lock,
  User,
  Mail,
  KeyRound,
  Radio,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Building2,
  ChevronDown
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { authSignIn, authSignUp, isSupabaseConfigured } from '../services/supabase';

interface AuthPageProps {
  onAuthSuccess: (user: UserProfile, token: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState<string>('GUARD-8812');
  const [loginPassword, setLoginPassword] = useState<string>('1234');
  const [loginGate, setLoginGate] = useState<string>('Main Gate #1');

  // Sign Up Form States
  const [signupFullName, setSignupFullName] = useState<string>('');
  const [signupEmployeeId, setSignupEmployeeId] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupRole, setSignupRole] = useState<UserRole>('GATE_GUARD');
  const [signupGate, setSignupGate] = useState<string>('Main Gate #1');

  // UX Feedback States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick Demo Preset Logins
  const handlePresetSelect = (empId: string, pass: string, gate: string) => {
    setActiveTab('LOGIN');
    setLoginIdentifier(empId);
    setLoginPassword(pass);
    setLoginGate(gate);
    setErrorMsg(null);
  };

  // Submit Handler for Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginIdentifier.trim()) {
      setErrorMsg('Please enter your Email or Employee ID.');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authSignIn(loginIdentifier, loginPassword, loginGate);
      setSuccessMsg(`Welcome, ${result.user.full_name}! Redirecting to SmeltIQ Dashboard...`);
      setTimeout(() => {
        onAuthSuccess(result.user, result.token);
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Handler for Sign Up
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!signupFullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!signupEmployeeId.trim()) {
      setErrorMsg('Employee ID is required (e.g. GUARD-1090 or SUP-004).');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMsg('A valid Email address is required.');
      return;
    }
    if (signupPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authSignUp({
        fullName: signupFullName,
        employeeId: signupEmployeeId,
        email: signupEmail,
        password: signupPassword,
        role: signupRole,
        assignedGate: signupGate
      });
      setSuccessMsg(`Account created for ${result.user.full_name}! Redirecting to Dashboard...`);
      setTimeout(() => {
        onAuthSuccess(result.user, result.token);
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Account registration failed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Ambience & Soft Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white/70 backdrop-blur-md z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                SmeltIQ
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md tracking-wider uppercase">
                Gate Entry
              </span>
            </div>
            <span className="text-xs text-slate-500">Vizag Steel Operations</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-600 font-medium hidden sm:inline">
            {isSupabaseConfigured ? 'Supabase Auth Ready' : 'Local Auth Mock Mode'}
          </span>
        </div>
      </nav>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
          {/* Card Top Title Banner */}
          <div className="p-6 bg-slate-50 border-b border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto flex items-center justify-center mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              {activeTab === 'LOGIN' ? 'Sign In to SmeltIQ' : 'Create Staff Account'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === 'LOGIN'
                ? 'Access automated gate entry OCR and statutory compliance'
                : 'Register as Gate Guard or Plant Operations Supervisor'}
            </p>
          </div>

          {/* Tab Switcher: Login vs Sign Up */}
          <div className="p-3 bg-slate-50/50 border-b border-slate-200">
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LOGIN');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  activeTab === 'LOGIN'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('SIGNUP');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  activeTab === 'SIGNUP'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
            </div>
          </div>

          {/* Validation Messages */}
          {errorMsg && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tab 1: LOGIN FORM */}
          {activeTab === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email or Employee ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. GUARD-8812 or officer@vizagsteel.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password or guard PIN"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gate Terminal Station
                </label>
                <div className="relative">
                  <select
                    value={loginGate}
                    onChange={(e) => setLoginGate(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition appearance-none cursor-pointer"
                  >
                    <option value="Main Gate #1">Main Gate #1 (Heavy Inbound Haulage)</option>
                    <option value="Exit Gate #2">Exit Gate #2 (Outbound Dispatch)</option>
                    <option value="Raw Materials Gate #3">Raw Materials Gate #3 (Ore & Minerals)</option>
                    <option value="Slag/Scrap Gate #4">Slag/Scrap Gate #4 (By-products Yard)</option>
                  </select>
                  <Radio className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-sm hover:shadow flex items-center justify-center space-x-2 transition active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In to Gate System</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Demo Account Pills */}
              <div className="pt-3 border-t border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1 mb-2">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>One-Tap Demo Credentials</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('GUARD-8812', '1234', 'Main Gate #1')}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 text-left transition"
                  >
                    <div className="font-bold text-blue-700">Gate Guard</div>
                    <div className="text-[10px] text-slate-500 truncate">GUARD-8812 • Main Gate #1</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('SUPER88', 'SUPER88', 'Main Gate #1')}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50/50 border border-slate-200 text-left transition"
                  >
                    <div className="font-bold text-amber-800">Supervisor</div>
                    <div className="text-[10px] text-slate-500 truncate">SUPER88 • Overrides & Audit</div>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Tab 2: SIGN UP FORM */}
          {activeTab === 'SIGNUP' && (
            <form onSubmit={handleSignupSubmit} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra Sharma"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={signupEmployeeId}
                    onChange={(e) => setSignupEmployeeId(e.target.value.toUpperCase())}
                    placeholder="e.g. GUARD-2041"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-mono uppercase focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="GATE_GUARD">Gate Guard</option>
                    <option value="PLANT_SUPERVISOR">Plant Supervisor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Official Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="e.g. ramesh.sharma@vizagsteel.in"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create secure password"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Gate
                </label>
                <select
                  value={signupGate}
                  onChange={(e) => setSignupGate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Main Gate #1">Main Gate #1</option>
                  <option value="Exit Gate #2">Exit Gate #2</option>
                  <option value="Raw Materials Gate #3">Raw Materials Gate #3</option>
                  <option value="Slag/Scrap Gate #4">Slag/Scrap Gate #4</option>
                </select>
              </div>

              {/* Submit Sign Up Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-sm flex items-center justify-center space-x-2 transition active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>Creating account...</span>
                ) : (
                  <>
                    <span>Create Staff Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 py-3 text-center text-xs text-slate-500 border-t border-slate-200 z-10">
        SmeltIQ Gate Entry Compliance System • Cruip Simple Light Theme
      </footer>
    </div>
  );
};
