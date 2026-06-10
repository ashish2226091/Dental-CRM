import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Patient } from '../types';

interface MasterDirectoryProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onOpenOnboardModal: () => void;
}

export default function MasterDirectory({
  patients,
  onSelectPatient,
  onOpenOnboardModal
}: MasterDirectoryProps) {
  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Page Header banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 font-display">
            <Users className="h-5 w-5 text-indigo-600" />
            PAGE 1: Master Patient Directory
          </h2>
          <p className="text-xs text-indigo-650 font-bold mt-1 uppercase tracking-wide">
            *“Click on a patient's name to open their complete medical lifecycle page.”*
          </p>
        </div>
        
        <button
          onClick={onOpenOnboardModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border-0 outline-none"
        >
          <UserPlus className="h-4 w-4" />
          Onboard Case (Manual)
        </button>
      </div>

      {patients.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-16 px-6 text-center shadow-xs">
          <Users className="h-12 w-12 text-slate-350 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 mb-1">CRM Database Reset Active</h3>
          <p className="text-xs text-slate-450 max-w-sm mx-auto mb-4">
            Our persistent memory is currently at 0 patients to comply with the fully wiped mandate. Onboard a patient or click the playbook templates above to construct records tree.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xs bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-4 text-center w-12">S.No</th>
                <th className="py-3 px-4">Patient Name (Clickable Link)</th>
                <th className="py-3 px-4">Age / Gender</th>
                <th className="py-3 px-4">Current Lifecycle Stage</th>
                <th className="py-3 px-4">Latest Action Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
              {patients.map((patient, index) => {
                const latestLog = patient.history && patient.history.length > 0 
                  ? patient.history[patient.history.length - 1] 
                  : "Registry created.";
                  
                return (
                  <tr key={patient.patient_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span 
                        onClick={() => onSelectPatient(patient)} 
                        className="text-indigo-600 hover:text-indigo-850 underline font-extra-bold cursor-pointer transition-colors"
                      >
                        [{patient.first_name} {patient.last_name}](#view-{patient.first_name.toLowerCase()}-{patient.last_name.toLowerCase()})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-550 font-sans">
                      {patient.age_dob} &middot; {patient.gender}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 text-[9px] rounded font-bold border bg-indigo-50 text-indigo-700 border-indigo-100/80 uppercase font-mono">
                        {patient.current_stage.replace('STAGE_', 'St. ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium italic max-w-xs truncate" title={latestLog}>
                      {latestLog.replace(/Logged by.*?\|/, '').trim()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
