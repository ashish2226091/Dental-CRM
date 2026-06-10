import React from 'react';
import { ArrowLeft, Activity } from 'lucide-react';
import { Patient, PatientStage } from '../types';

interface DossierHeaderProps {
  selectedPatient: Patient;
  patientAge: number;
  onUpdateStage: (patient: Patient, nextStage: PatientStage) => void;
  onBackToDirectory: () => void;
}

export default function DossierHeader({
  selectedPatient,
  patientAge,
  onUpdateStage,
  onBackToDirectory
}: DossierHeaderProps) {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Back button and patient ID bar */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
        <button
          onClick={onBackToDirectory}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border-0 outline-none"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Directory
        </button>
        <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Patient ID: {selectedPatient.patient_id}</span>
      </div>

      {/* 🟦 Consolidated Row */}
      <div 
        id="dossier-global-header-row" 
        className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-850 shadow-md flex flex-wrap items-center justify-between gap-4 font-sans leading-none"
      >
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-xs md:text-sm font-semibold">
          <span className="text-white text-sm md:text-base font-bold font-display flex items-center gap-2">
            👤 {selectedPatient.salutation || 'Mr.'} {selectedPatient.first_name} {selectedPatient.last_name}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300">{selectedPatient.gender}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-mono">{patientAge} Yrs ({selectedPatient.age_dob})</span>
          <span className="text-slate-600">|</span>
          <span className="text-indigo-300 font-mono font-bold">{selectedPatient.mobile || 'N/A'}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-[10.5px] md:text-xs font-mono font-bold bg-indigo-950 border border-indigo-900 text-indigo-300 px-3 py-2 rounded-xl flex items-center gap-2 leading-none shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>🟢 <strong>Active Case Stage:</strong> {selectedPatient.current_stage.replace('STAGE_', 'STAGE ').replace('_', ' ')}</span>
          </div>
          
          <select 
            id="quick-stage-changer"
            value={selectedPatient.current_stage}
            onChange={(e) => onUpdateStage(selectedPatient, e.target.value as PatientStage)}
            className="bg-slate-800 hover:bg-slate-755 text-slate-100 border border-slate-700 text-[10px] md:text-xs font-bold py-1.5 px-2.5 rounded-xl cursor-pointer outline-none focus:ring-1 focus:ring-indigo-501 transition-all font-mono"
          >
            <option value="STAGE_1: FOLLOW_UP">STAGE 1: FOLLOW UP</option>
            <option value="STAGE_2: APPOINTMENT_SCHEDULED">STAGE 2: APPOINTMENT SCHEDULED</option>
            <option value="STAGE_3: TREATMENT_PLAN_SHARED">STAGE 3: PLAN SHARED</option>
            <option value="STAGE_4: TREATMENT_ACCEPTED">STAGE 4: PLAN ACCEPTED</option>
            <option value="STAGE_5: PAYMENT_COMPLETED">STAGE 5: EMI ACTIVE / PAID</option>
          </select>
        </div>
      </div>
    </div>
  );
}
