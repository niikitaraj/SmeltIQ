import React, { useState } from 'react';
import {
  BookOpen,
  PhoneCall,
  AlertTriangle,
  ShieldCheck,
  Scale,
  Flame,
  HardHat,
  FileText,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const SafetySopPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'EXPIRED_CERT' | 'EMERGENCY' | 'HAZMAT'>('EXPIRED_CERT');
  const [callAlert, setCallAlert] = useState<string | null>(null);

  const emergencyContacts = [
    {
      title: 'Plant Safety Officer (Shift Incharge)',
      name: 'Er. Sandeep Varma',
      extension: 'Ext: 2201',
      phone: '+91 891 251 8801',
      badge: 'Immediate Incident Escalation'
    },
    {
      title: 'Main Security Control Room',
      name: 'Central Desk (24x7 Post)',
      extension: 'Ext: 100',
      phone: '+91 891 251 9000',
      badge: 'Gate Breach & Threat Desk'
    },
    {
      title: 'Transport & Weighbridge Supervisor',
      name: 'Capt. Alok Gupta',
      extension: 'Ext: 3412',
      phone: '+91 891 251 3412',
      badge: 'Verbal PIN Overrides & Scale Divert'
    },
    {
      title: 'Medical Center & Plant Ambulance',
      name: 'Sector 5 Emergency Wing',
      extension: 'Ext: 108',
      phone: '+91 891 251 1088',
      badge: 'Medical Trauma Unit'
    }
  ];

  const handleDial = (contact: typeof emergencyContacts[0]) => {
    setCallAlert(`Initiating internal radio bridge to ${contact.title} (${contact.extension})...`);
    setTimeout(() => {
      setCallAlert(null);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-sky-400" />
            <span>Plant Safety Standard Operating Procedures (SOP)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative gate terminal guidelines for statutory non-compliance, heavy vehicle limits, and emergency escalations.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
          <span>Rev: SOP-VIZAG-2026.4</span>
        </div>
      </div>

      {/* Quick Navigation Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('EXPIRED_CERT')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeTab === 'EXPIRED_CERT'
              ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="truncate">Expired Certificate SOP</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('EMERGENCY')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeTab === 'EMERGENCY'
              ? 'bg-rose-600 text-white shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span className="truncate">Emergency Contacts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HAZMAT')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeTab === 'HAZMAT'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span className="truncate">Heavy Trucks & Hazmat</span>
        </button>
      </div>

      {callAlert && (
        <div className="p-3 rounded-2xl bg-sky-950/70 border border-sky-600 text-sky-200 text-xs flex items-center space-x-2 animate-in fade-in">
          <PhoneCall className="w-4 h-4 text-sky-400 animate-pulse" />
          <span>{callAlert}</span>
        </div>
      )}

      {/* Tab 1: Expired Certificate Protocol */}
      {activeTab === 'EXPIRED_CERT' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center space-x-2.5 text-sky-400 border-b border-slate-800 pb-3">
              <FileText className="w-5 h-5" />
              <h2 className="text-base font-bold text-white">
                Expired Certificate Protocol (PUC / RC Violation Protocol)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-300 font-black text-sm flex items-center justify-center font-mono">
                  01
                </div>
                <h4 className="font-bold text-slate-100 text-xs">Immediate Staging in Holding Bay</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Do not allow the vehicle past the optical scanner barrier. Signal driver to turn into <strong>Holding Bay 3</strong> to prevent bottlenecking the weighbridge approach.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 font-black text-sm flex items-center justify-center font-mono">
                  02
                </div>
                <h4 className="font-bold text-slate-100 text-xs">Driver Notification & Physical Proof</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Inform driver that the Surepass statutory check returned an EXPIRED or SUSPENDED certificate. Request if they possess an updated physical renewal slip issued within the last 24 hours.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 font-black text-sm flex items-center justify-center font-mono">
                  03
                </div>
                <h4 className="font-bold text-slate-100 text-xs">Supervisor Escalation or Turnaround</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  If valid renewal is produced, radio Shift Supervisor for <strong>PIN Override (SUPER88)</strong>. If expired and no proof exists, direct vehicle to Turnaround U-Lane and log incident in audit trail.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
              <strong className="text-slate-100 block">Penalties Under Statutory Factory Acts:</strong>
              <p className="text-slate-400 text-[11px]">
                Under the Andhra Pradesh Motor Vehicles Rules & Steel Plant Environmental Guidelines, unauthorized entry of vehicles with expired emission (PUC) certificates attracts an administrative penalty of ₹5,000 against the contracted freight vendor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Emergency Contacts */}
      {activeTab === 'EMERGENCY' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center space-x-2.5 text-rose-400 border-b border-slate-800 pb-3">
              <PhoneCall className="w-5 h-5" />
              <h2 className="text-base font-bold text-white">
                One-Touch Emergency Radio & Gate Phone Directory
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {emergencyContacts.map((contact, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 font-bold uppercase">
                        {contact.extension}
                      </span>
                      <span className="text-[10px] text-rose-400/90 font-medium">
                        {contact.badge}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-slate-100">{contact.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{contact.name}</p>
                    <p className="text-xs font-mono font-bold text-slate-300 mt-2">{contact.phone}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDial(contact)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-rose-300 border border-slate-800 hover:border-rose-800 font-bold text-xs flex items-center justify-center space-x-2 transition active:scale-95 shadow-sm"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Dial Ext {contact.extension.split(': ')[1]}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Heavy Trucks & Hazmat Rules */}
      {activeTab === 'HAZMAT' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center space-x-2.5 text-amber-400 border-b border-slate-800 pb-3">
              <Scale className="w-5 h-5" />
              <h2 className="text-base font-bold text-white">
                Heavy Vehicle Axle Load & Steel Coil Haulage Rules
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Scale className="w-4 h-4" />
                  <strong className="text-xs uppercase tracking-wider text-slate-200">
                    Gross Vehicle Weight (GVW) Ceilings
                  </strong>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex justify-between border-b border-slate-800/80 pb-1.5">
                    <span>2-Axle Rigid Truck:</span>
                    <strong className="font-mono text-sky-400">Max 19 Metric Tonnes</strong>
                  </li>
                  <li className="flex justify-between border-b border-slate-800/80 pb-1.5">
                    <span>3-Axle Rigid Truck:</span>
                    <strong className="font-mono text-sky-400">Max 28 Metric Tonnes</strong>
                  </li>
                  <li className="flex justify-between border-b border-slate-800/80 pb-1.5">
                    <span>Multi-Axle Semi-Trailer (Coil Carrier):</span>
                    <strong className="font-mono text-sky-400">Max 49 Metric Tonnes</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Hydraulic Multi-Axle Puller:</span>
                    <strong className="font-mono text-amber-400">Special Permit Required</strong>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-rose-400">
                  <HardHat className="w-4 h-4" />
                  <strong className="text-xs uppercase tracking-wider text-slate-200">
                    Mandatory PPE & Hazmat Checklist
                  </strong>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Hard Hat (Safety Helmet) with chin strap for driver & helper</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>High-Visibility Reflective Vest & Steel-Toe Safety Shoes</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Exhaust Spark Arrestor fitted for Blast Furnace & Gas Zones</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span>Dry Chemical Powder (DCP) 9kg fire extinguisher mounted</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
