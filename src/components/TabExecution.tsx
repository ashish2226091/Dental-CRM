import React from 'react';
import { Activity, Clock, CheckCircle, Check, PlusCircle, Calendar } from 'lucide-react';
import { TreatmentPlan } from '../types';

interface TabExecutionProps {
  activeTreatmentPlans: TreatmentPlan[];
  handleMarkPlanStatusDone: (planId: string, statusText: string) => void;
  visitStep: string;
  setVisitStep: (val: string) => void;
  visitConductedBy: string;
  setVisitConductedBy: (val: string) => void;
  visitAssistedBy: string;
  setVisitAssistedBy: (val: string) => void;
  visitRemarks: string;
  setVisitRemarks: (val: string) => void;
  handleAppendVisitLog: (planId: string) => void;
  onPrevStep: () => void;
}

export default function TabExecution({
  activeTreatmentPlans,
  handleMarkPlanStatusDone,
  visitStep,
  setVisitStep,
  visitConductedBy,
  setVisitConductedBy,
  visitAssistedBy,
  setVisitAssistedBy,
  visitRemarks,
  setVisitRemarks,
  handleAppendVisitLog,
  onPrevStep
}: TabExecutionProps) {
  return (
    <div id="tab-content-tab_e" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6 animate-fadeIn">
      
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
          Section E: Ongoing Clinical Execution Dashboard (Treatment in Progress)
        </h3>
        <p className="text-[11.5px] text-slate-500 mt-1">
          Visit-by-visit tracking matrices running parallel treatment tracks with independent closure options.
        </p>
      </div>

      {activeTreatmentPlans.length === 0 ? (
        <div className="p-10 text-center text-xs text-slate-450 italic border border-dashed border-slate-200 bg-slate-50 rounded-2xl">
          No active running treatment plans launched yet. Add items and lock a plan in TAB D to initiate tracking!
        </div>
      ) : (
        <div className="space-y-8">
          {activeTreatmentPlans.map((plan) => {
            const isInProgress = plan.status === 'Treatment in Progress';
            return (
              <div 
                key={plan.plan_id} 
                className={`border p-5 rounded-2xl flex flex-col gap-4.5 relative transition-all shadow-xs ${
                  isInProgress ? 'bg-indigo-50/10 border-indigo-200/50' : 'bg-slate-50 border-slate-150 opacity-90'
                }`}
              >
                {/* Plan Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200/60 pb-3">
                  <div className="space-y-1">
                    <h4 className="text-xs md:text-sm font-black text-slate-850 flex items-center gap-2 font-display uppercase tracking-tight">
                      📂 {plan.plan_name}
                    </h4>
                    <span className="text-[9.5px] font-mono text-slate-400 block font-bold">PLAN ID: {plan.plan_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 border leading-none ${
                      isInProgress 
                        ? 'bg-amber-50 text-amber-750 border-amber-200 animate-pulse' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {isInProgress ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3 animate-none" />}
                      {plan.status}
                    </span>
                    
                    {isInProgress ? (
                      <button
                        onClick={() => handleMarkPlanStatusDone(plan.plan_id, 'Treatment Done')}
                        className="text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl border-y border-emerald-650 cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 transition-all outline-none"
                      >
                        <Check className="h-3.5 w-3.5 text-white" /> Complete Plan ✅
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono italic select-none">frozen-logs</span>
                    )}
                  </div>
                </div>

                {/* Procedure Details */}
                <div className="text-xs text-slate-700 space-y-1">
                  <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block font-mono">Procedure Bundle Details</span>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.billing_items.map((b, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 px-3 py-1 rounded-xl font-bold text-slate-705 text-[10.5px]">
                        Tooth {b.tooth_no.join(', ')} &rarr; <span className="text-indigo-700 font-extrabold">{b.procedure_name}</span> (₹{b.final_total.toLocaleString()})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Visit Matrix Logs */}
                <div className="space-y-2 mt-1">
                  <span className="text-[9.5px] font-black text-slate-455 uppercase tracking-widest block font-mono">🩺 Clinicians Interaction & Visit Logs</span>
                  
                  {plan.visit_logs.length === 0 ? (
                    <p className="text-xs text-slate-450 italic bg-white p-4 rounded-xl border border-dashed border-slate-200">
                      No active visitation logs recorded yet for this plan. Perform clinical diagnostic evaluation & log the first visit below.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11.5px] bg-white rounded-xl overflow-hidden border border-slate-200 shadow-tiny">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-mono text-slate-550 uppercase text-[9.5px]">
                            <th className="p-3 w-14 text-center">Visit</th>
                            <th className="p-3 w-28">Date</th>
                            <th className="p-3">Executed Step</th>
                            <th className="p-3 text-center w-20">Teeth</th>
                            <th className="p-3">Operator</th>
                            <th className="p-3">Assistant</th>
                            <th className="p-3">Clinical Progress Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {plan.visit_logs.map((visit) => (
                            <tr key={visit.visit_id} className="hover:bg-slate-50/50">
                              <td className="p-3 text-center font-mono font-black text-indigo-750 bg-indigo-50/20">{visit.visit_number}</td>
                              <td className="p-3 font-mono text-slate-500">{visit.date}</td>
                              <td className="p-3 font-bold text-slate-850">{visit.procedure_step}</td>
                              <td className="p-3 text-center font-mono bg-slate-50 font-bold text-indigo-700">{visit.assigned_teeth.join(', ')}</td>
                              <td className="p-3 font-semibold text-slate-700">{visit.conducted_by}</td>
                              <td className="p-3 text-slate-600">{visit.assisted_by || 'N/A'}</td>
                              <td className="p-3 italic text-slate-550 font-serif leading-relaxed">{visit.remarks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Logging Form */}
                {isInProgress && (
                  <div className="bg-white border border-dashed border-indigo-205 p-4 rounded-2xl flex flex-col gap-3.5 mt-1 shadow-sm">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-700 uppercase tracking-widest leading-none">
                      <PlusCircle className="h-4 w-4" /> Log Next Visit (V{plan.visit_logs.length + 1})
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                      <div className="sm:col-span-4 flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Procedure Step</span>
                        <select 
                          value={visitStep}
                          onChange={(e) => setVisitStep(e.target.value)}
                          className="bg-slate-50 p-2 rounded-xl border border-slate-200 outline-none text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white"
                        >
                          <option value="Access Opening">Access Opening</option>
                          <option value="Biomechanical Preparation">Biomechanical Prep (BMP)</option>
                          <option value="Cleaning & Irrigation">Cleaning & Irrigation</option>
                          <option value="Canal Filling / Obturation">Obturation (Filling)</option>
                          <option value="Composite Restoration">Composite Restoration</option>
                          <option value="Crown Shaping & Trial">Crown Trial</option>
                          <option value="Crown Permanent Cementation">Permanent Cementation</option>
                          <option value="Suture Removal">Suture Removal</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4 flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Primary Doctor</span>
                        <input 
                          type="text"
                          value={visitConductedBy}
                          onChange={(e) => setVisitConductedBy(e.target.value)}
                          className="bg-slate-50 p-2 rounded-xl border border-slate-200 outline-none text-xs font-medium text-slate-805 focus:bg-white"
                        />
                      </div>

                      <div className="sm:col-span-4 flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Assistant Staff</span>
                        <input 
                          type="text"
                          value={visitAssistedBy}
                          onChange={(e) => setVisitAssistedBy(e.target.value)}
                          className="bg-slate-50 p-2 rounded-xl border border-slate-200 outline-none text-xs text-slate-800 focus:bg-white"
                        />
                      </div>

                      <div className="sm:col-span-9 flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Clinical Progress Remarks / Notes</span>
                        <input 
                          type="text"
                          placeholder="Patient reported zero pain post-op, normal occlusion trial done..."
                          value={visitRemarks}
                          onChange={(e) => setVisitRemarks(e.target.value)}
                          className="bg-slate-50 p-2 rounded-xl border border-slate-200 outline-none text-xs placeholder-slate-400 font-serif text-slate-800 focus:bg-white"
                        />
                      </div>

                      <div className="sm:col-span-3 flex items-end">
                        <button
                          id={`btn-log-visit-${plan.plan_id}`}
                          onClick={() => handleAppendVisitLog(plan.plan_id)}
                          className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-black h-9.5 rounded-xl border-y border-indigo-700 cursor-pointer text-xs transition-colors outline-none shadow-xs"
                        >
                          Log Visit V{plan.visit_logs.length + 1} 🚀
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Wizard Navigation Footer */}
      <div className="border-t border-slate-100 pt-5 flex justify-start">
        <button
          id="wizard-move-back-to-tab-d"
          onClick={onPrevStep}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-3.5 rounded-xl cursor-pointer border-0 transition-all outline-none"
        >
          ⬅️ Back to Treatment Creator
        </button>
      </div>

    </div>
  );
}
