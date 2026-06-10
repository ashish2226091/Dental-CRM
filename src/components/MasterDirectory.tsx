import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Calendar, 
  MoreVertical, 
  User, 
  Tag, 
  CheckCircle, 
  Phone, 
  Copy, 
  ExternalLink,
  ClipboardList
} from 'lucide-react';
import { Patient, PatientStage } from '../types';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [tillDate, setTillDate] = useState('');
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  // Helper to parse DD-MM-YYYY to a standard Date object
  const parseLastVisitDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return null;
  };

  // Filter Patients
  const filteredPatients = patients.filter((patient) => {
    // 1. Search Query
    const query = searchTerm.toLowerCase().trim();
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(query) ||
      (patient.patient_id || '').toLowerCase().includes(query) ||
      (patient.mobile || '').includes(query);

    // 2. Till date calendar filter (items whose last visit is before/equal to tillDate selection)
    if (!matchesSearch) return false;

    if (tillDate) {
      const selected = new Date(tillDate);
      // Reset times for date-only comparison
      selected.setHours(0, 0, 0, 0);

      const patientDate = parseLastVisitDate(patient.last_visit || '01-01-2026');
      if (patientDate) {
        patientDate.setHours(0, 0, 0, 0);
        return patientDate <= selected;
      }
      return false;
    }

    return true;
  });

  // Handle category update local simulation / fallback
  const handleUpdateCategory = async (patient: Patient, category: string) => {
    const updatedPatient = { ...patient, category };
    try {
      const res = await fetch('/api/patients/manual-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patient.patient_id,
          notes: `Logged by Coordinator | Customized category changed manually to label: ${category}.`
        })
      });
      if (res.ok) {
        // Also update the direct category field
        await fetch('/api/patients/update-full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedPatient)
        });
      }
    } catch(err) {
      console.error(err);
    }
    setActiveActionId(null);
  };

  // Handle Status complete/active flip
  const handleToggleStatus = async (patient: Patient) => {
    let nextStage: PatientStage = patient.current_stage;
    const currentIsDone = patient.current_stage === 'STAGE_5: PAYMENT_COMPLETED';
    
    if (currentIsDone) {
      nextStage = 'STAGE_4: TREATMENT_ACCEPTED';
    } else {
      nextStage = 'STAGE_5: PAYMENT_COMPLETED';
    }

    try {
      await fetch('/api/patients/manual-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patient.patient_id,
          stage: nextStage,
          notes: `Logged by Coordinator | Patient status toggled manually to: ${
            nextStage === 'STAGE_5: PAYMENT_COMPLETED' ? 'Treatment Done' : 'Active State'
          }.`
        })
      });
    } catch(err) {
      console.error(err);
    }
    setActiveActionId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copied ID "${text}" to clipboard!`);
    setActiveActionId(null);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      
      {/* Search and Filters Header */}
      <div id="directory-filters-bar" className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
          <input
            id="search-patient-input"
            type="text"
            placeholder="Search by patient name / ID / mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-medium text-slate-700 transition-all font-sans"
          />
        </div>

        {/* Date till date picker */}
        <div id="filter-calendar-wrapper" className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Till Date:</span>
          </div>
          <input
            id="filter-till-date"
            type="date"
            value={tillDate}
            onChange={(e) => setTillDate(e.target.value)}
            className="bg-transparent border-0 outline-none text-slate-700 text-xs font-semibold cursor-pointer"
          />
          {tillDate && (
            <button 
              onClick={() => setTillDate('')}
              className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded hover:bg-slate-300 font-mono font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dynamic Metric Scope Indicator */}
        <div id="directory-scope-metric" className="flex items-center gap-2 px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
          <ClipboardList className="h-4 w-4 text-indigo-650" />
          <span className="text-xs font-black text-indigo-750 font-mono">
            (Showing {filteredPatients.length} of {patients.length} patients)
          </span>
        </div>

        {/* Create patient manual shortcut button */}
        <button
          id="btn-trigger-onboard-patient"
          onClick={onOpenOnboardModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer border-0 outline-none"
        >
          <UserPlus className="h-4 w-4" />
          Onboard Case (Manual)
        </button>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl py-16 px-6 text-center shadow-xs">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3 animate-pulse" />
          <h3 className="text-sm font-black text-slate-700 mb-1 uppercase tracking-wider font-mono">No Patients Matched</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Specify a different search phrase, clear the Till Date calendar filter, or click "Onboard Case" to create custom records.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-sm bg-white">
          <table id="patients-data-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest border-b border-slate-800">
                <th className="py-4 px-4 text-center w-12">#</th>
                <th className="py-4 px-5">Patient Details</th>
                <th className="py-4 px-4">Contact</th>
                <th className="py-4 px-4 font-mono">Patient ID</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">Last Visit</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-750 text-xs font-semibold">
              {filteredPatients.map((patient, index) => {
                const isActionOpen = activeActionId === patient.patient_id;
                
                // Determine category (default to General if blank)
                const category = patient.category || patient.appointment_booking?.patient_category || 'General';
                
                // Status mapping: "Active State" or "Treatment Done"
                // Let's decide based on current Stage 5 or completion of treatment plans
                const currentIsDone = patient.current_stage === 'STAGE_5: PAYMENT_COMPLETED' || 
                  (patient.active_treatment_plans && patient.active_treatment_plans.length > 0 && patient.active_treatment_plans.every(p => p.status === 'Treatment Done'));
                
                const lastVisitDate = patient.last_visit || '07-04-2026';

                return (
                  <tr key={patient.patient_id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* 1. Sequential Index */}
                    <td className="py-4.5 px-4 text-center text-slate-400 font-mono font-medium">
                      {index + 1}
                    </td>

                    {/* 2. Patient Details with clickable link format */}
                    <td className="py-4.5 px-5">
                      <div className="flex flex-col">
                        <span 
                          onClick={() => onSelectPatient(patient)} 
                          className="text-indigo-600 hover:text-indigo-850 underline font-extrabold cursor-pointer transition-colors text-sm font-display"
                        >
                          [{patient.salutation || 'Mr.'} {patient.first_name} {patient.last_name}](#view-{patient.first_name.toLowerCase()}-{patient.last_name.toLowerCase()})
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                          <span>{patient.gender}</span>
                          <span>&middot;</span>
                          <span>{patient.age_dob}</span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Contact mobile number */}
                    <td className="py-4.5 px-4">
                      <div className="flex items-center gap-1 text-slate-600 font-mono font-bold">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{patient.mobile || 'Unspecified'}</span>
                      </div>
                    </td>

                    {/* 4. Unique System ID */}
                    <td className="py-4.5 px-4 text-slate-500 font-mono font-semibold">
                      {patient.patient_id}
                    </td>

                    {/* 5. Patient categories */}
                    <td className="py-4.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 text-[9px] rounded-lg font-extrabold border ${
                        category === 'VIP' 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : category === 'Corporate'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : category === 'Diabetic'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                      } uppercase font-mono`}>
                        {category}
                      </span>
                    </td>

                    {/* 6. Last visit DD-MM-YYYY */}
                    <td className="py-4.5 px-4 text-slate-550 font-mono font-semibold">
                      {lastVisitDate}
                    </td>

                    {/* 7. Status representation */}
                    <td className="py-4.5 px-4 text-center">
                      {currentIsDone ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] rounded-lg font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-mono">
                          <CheckCircle className="h-2.5 w-2.5" /> Treatment Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] rounded-lg font-black bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase font-mono animate-pulse">
                          Active State
                        </span>
                      )}
                    </td>

                    {/* 8. Action three-dot interactive popover */}
                    <td className="py-4.5 px-4 text-center relative">
                      <button
                        onClick={() => setActiveActionId(isActionOpen ? null : patient.patient_id)}
                        className="p-1 px-2 text-slate-450 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors outline-none cursor-pointer border-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {isActionOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveActionId(null)} 
                          />
                          <div className="absolute right-4 top-11 bg-white border border-slate-200 rounded-xl shadow-xl w-44 p-1.5 z-20 text-left flex flex-col gap-0.5 animate-fadeIn">
                            
                            <button
                              onClick={() => {
                                onSelectPatient(patient);
                                setActiveActionId(null);
                              }}
                              className="w-full text-left font-bold text-slate-700 hover:bg-slate-100 px-3 py-2 text-[11px] rounded-lg flex items-center gap-2 hover:text-indigo-650 cursor-pointer border-0 outline-none"
                            >
                              <User className="h-3.5 w-3.5 text-indigo-500" />
                              View Dossier
                            </button>

                            <button
                              onClick={() => handleToggleStatus(patient)}
                              className="w-full text-left font-bold text-slate-700 hover:bg-slate-100 px-3 py-2 text-[11px] rounded-lg flex items-center gap-2 cursor-pointer border-0 outline-none"
                            >
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-550" />
                              Toggle Status
                            </button>

                            <button
                              onClick={() => copyToClipboard(patient.patient_id)}
                              className="w-full text-left font-bold text-slate-700 hover:bg-slate-100 px-3 py-2 text-[11px] rounded-lg flex items-center gap-2 cursor-pointer border-0 outline-none"
                            >
                              <Copy className="h-3.5 w-3.5 text-slate-500" />
                              Copy Patient ID
                            </button>

                            <div className="border-t border-slate-150 my-1 font-mono text-[9px] px-3 py-0.5 text-slate-400 font-bold uppercase">Change Category</div>
                            
                            {['General', 'VIP', 'Corporate', 'Diabetic'].map((cat) => (
                              <button
                                key={cat}
                                onClick={() => handleUpdateCategory(patient, cat)}
                                className={`w-full text-left font-semibold px-4 py-1.5 text-[10px] rounded-md transition-colors flex items-center justify-between border-0 outline-none cursor-pointer ${
                                  category === cat 
                                    ? 'bg-slate-900 text-white font-bold' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                              >
                                <span>{cat}</span>
                                {category === cat && <span className="text-[8px] font-mono text-emerald-400">✓</span>}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
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
