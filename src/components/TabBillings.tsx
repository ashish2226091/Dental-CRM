import React from 'react';
import { Sparkles, Plus, Trash2, Lock, ShieldAlert, Check, RefreshCw } from 'lucide-react';
import { Patient, BillingItem } from '../types';

interface TabBillingsProps {
  selectedPatient: Patient;
  patientAge: number;
  isChild: boolean;
  SYSTEM_DENTAL_PROCEDURES: any[];
  selectedPredefinedId: string;
  setSelectedPredefinedId: (val: string) => void;
  discountPercent: number;
  setDiscountPercent: (val: number) => void;
  gstPercent: number;
  setGstPercent: (val: number) => void;
  selectedTeeth: number[];
  onToggleTooth: (tooth: number) => void;
  onSelectAllTeeth: () => void;
  onClearTeeth: () => void;
  countSelected: number;
  activeRate: number;
  grossAmount: number;
  finalPriceWithGst: number;
  handleAddProcedureToDraft: () => void;
  creatorError: string;
  creatorSuccess: string;
  draftBillingItems: BillingItem[];
  handleRemoveDraftItem: (idx: number) => void;
  selectedPaymentMode: string;
  setSelectedPaymentMode: (val: string) => void;
  draftGrandTotal: number;
  handleLockAndActivatePlan: () => void;
  aiInputText: string;
  setAiInputText: (val: string) => void;
  handleAISubmit: () => void;
  aiLoading: boolean;
  setShowCustomPopup: (val: boolean) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
}

// FDI Teeth configurations
const FDI_ADULT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const FDI_ADULT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const FDI_ADULT_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const FDI_ADULT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

const FDI_CHILD_UPPER_RIGHT = [55, 54, 53, 52, 51];
const FDI_CHILD_UPPER_LEFT = [61, 62, 63, 64, 65];
const FDI_CHILD_LOWER_RIGHT = [85, 84, 83, 82, 81];
const FDI_CHILD_LOWER_LEFT = [71, 72, 73, 74, 75];

export default function TabBillings({
  selectedPatient,
  patientAge,
  isChild,
  SYSTEM_DENTAL_PROCEDURES,
  selectedPredefinedId,
  setSelectedPredefinedId,
  discountPercent,
  setDiscountPercent,
  gstPercent,
  setGstPercent,
  selectedTeeth,
  onToggleTooth,
  onSelectAllTeeth,
  onClearTeeth,
  countSelected,
  activeRate,
  grossAmount,
  finalPriceWithGst,
  handleAddProcedureToDraft,
  creatorError,
  creatorSuccess,
  draftBillingItems,
  handleRemoveDraftItem,
  selectedPaymentMode,
  setSelectedPaymentMode,
  draftGrandTotal,
  handleLockAndActivatePlan,
  aiInputText,
  setAiInputText,
  handleAISubmit,
  aiLoading,
  setShowCustomPopup,
  onPrevStep,
  onNextStep
}: TabBillingsProps) {
  return (
    <div id="tab-content-tab_d" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6 animate-fadeIn">
      
      <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Section D: Treatment Plan Creator & Billings Table
          </h3>
          <p className="text-[11.5px] text-slate-550 mt-1 font-sans">
            Construct line procedures, select affected FDI tooth coordinates, configure custom discount/GST fields, and apply modes.
          </p>
        </div>
        
        <button 
          id="btn-trigger-custom-pop-up"
          onClick={() => setShowCustomPopup(true)}
          className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer self-start sm:self-center"
        >
          <Plus className="h-3.5 w-3.5" /> + Add Doctor (Custom Procedure)
        </button>
      </div>

      {/* Catalog Selection Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-200/50">
        <div className="md:col-span-5">
          <label className="text-[9.5px] font-bold text-slate-450 uppercase tracking-widest block mb-1">1. Choose Procedure Name</label>
          <select
            id="procedure-picker-dropdown"
            value={selectedPredefinedId}
            onChange={(e) => {
              setSelectedPredefinedId(e.target.value);
              if (e.target.value === 'custom') {
                setShowCustomPopup(true);
              }
            }}
            className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800 cursor-pointer"
          >
            <optgroup label="Auto-Billing Systems Catalog">
              {SYSTEM_DENTAL_PROCEDURES.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — (₹{p.rate.toLocaleString()})
                </option>
              ))}
            </optgroup>
            <optgroup label="Manual Entry options">
              <option value="custom">⚙️ Click to Trigger Custom Simulation Pop-Up</option>
            </optgroup>
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="text-[9.5px] font-bold text-slate-450 uppercase tracking-widest block mb-1">Discount %</label>
          <input
            id="treatment-creator-discount-value"
            type="number"
            min="0"
            max="100"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
            className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-slate-805 text-center font-bold"
          />
        </div>

        <div className="md:col-span-4">
          <label className="text-[9.5px] font-bold text-slate-450 uppercase tracking-widest block mb-1">GST Tax %</label>
          <div className="flex gap-1.5">
            <input
              id="treatment-creator-gst-value"
              type="number"
              min="0"
              max="100"
              value={gstPercent}
              onChange={(e) => setGstPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="w-2/5 text-xs bg-white border border-slate-250 rounded-xl py-2.5 text-slate-805 text-center font-bold"
            />
            <div className="grid grid-cols-3 gap-0.5 w-3/5 font-mono text-[9px]">
              {[0, 12, 18].map(pst => (
                <button
                  key={pst}
                  type="button"
                  onClick={() => setGstPercent(pst)}
                  className={`py-2 rounded border transition-colors cursor-pointer ${gstPercent === pst ? 'bg-indigo-600 text-white border-indigo-700 font-bold' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'}`}
                >
                  {pst}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooth Coordinates Map */}
      <div className="border border-slate-200 p-4.5 rounded-2xl bg-slate-50/50">
        <div className="flex items-center justify-between mb-2 text-xs">
          <label className="text-[9.5px] font-bold text-slate-450 uppercase tracking-widest block">2. Select tooth numbers (FDI Charting Map)</label>
          <div className="flex gap-2 font-mono text-[9px]">
            <button onClick={onSelectAllTeeth} className="text-indigo-650 hover:underline border-0 bg-transparent cursor-pointer font-bold">Select All</button>
            <span className="text-slate-300">|</span>
            <button onClick={onClearTeeth} className="text-slate-500 hover:underline border-0 bg-transparent cursor-pointer font-bold">Clear All</button>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 mb-3.5 leading-relaxed">
          Active configuration for <span className="font-bold text-slate-700">{isChild ? "Children (Primary Dentition 51–85)" : "Adults (Permanent Dentition 11–48)"}</span> based on calculated age of <span className="font-bold text-indigo-600">{patientAge} years old</span>.
        </p>

        {/* FDI Grid Map rendering */}
        <div className="flex flex-col gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-inner">
          <div className="text-[8px] font-bold text-slate-450 uppercase tracking-widest text-center py-0.5">Upper Maxilla</div>
          <div className="grid grid-cols-2 gap-3 border-b border-slate-200/80 pb-2.5">
            <div className="text-right border-r border-dashed border-slate-200 pr-1">
              <span className="text-[7.5px] font-bold text-slate-400 block mb-0.5">Quadrant UR (Right)</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {(isChild ? FDI_CHILD_UPPER_RIGHT : FDI_ADULT_UPPER_RIGHT).map(t => {
                  const active = selectedTeeth.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      id={`tooth-node-${t}`}
                      onClick={() => onToggleTooth(t)}
                      className={`w-6 h-6 text-[9.5px] font-mono font-bold rounded flex items-center justify-center border cursor-pointer transition-colors ${
                        active ? 'bg-indigo-600 text-white border-indigo-700 font-black' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-left pl-1">
              <span className="text-[7.5px] font-bold text-slate-400 block mb-0.5">Quadrant UL (Left)</span>
              <div className="flex flex-wrap gap-1">
                {(isChild ? FDI_CHILD_UPPER_LEFT : FDI_ADULT_UPPER_LEFT).map(t => {
                  const active = selectedTeeth.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      id={`tooth-node-${t}`}
                      onClick={() => onToggleTooth(t)}
                      className={`w-6 h-6 text-[9.5px] font-mono font-bold rounded flex items-center justify-center border cursor-pointer transition-colors ${
                        active ? 'bg-indigo-600 text-white border-indigo-700 font-black' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="text-[8px] font-bold text-slate-450 uppercase tracking-widest text-center mt-1 py-0.5">Lower Mandible</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-right border-r border-dashed border-slate-200 pr-1">
              <span className="text-[7.5px] font-bold text-slate-400 block mb-0.5">Quadrant LR (Right)</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {(isChild ? FDI_CHILD_LOWER_RIGHT : FDI_ADULT_LOWER_RIGHT).map(t => {
                  const active = selectedTeeth.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      id={`tooth-node-${t}`}
                      onClick={() => onToggleTooth(t)}
                      className={`w-6 h-6 text-[9.5px] font-mono font-bold rounded flex items-center justify-center border cursor-pointer transition-colors ${
                        active ? 'bg-indigo-600 text-white border-indigo-700 font-black' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-left pl-1">
              <span className="text-[7.5px] font-bold text-slate-400 block mb-0.5">Quadrant LL (Left)</span>
              <div className="flex flex-wrap gap-1">
                {(isChild ? FDI_CHILD_LOWER_LEFT : FDI_ADULT_LOWER_LEFT).map(t => {
                  const active = selectedTeeth.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      id={`tooth-node-${t}`}
                      onClick={() => onToggleTooth(t)}
                      className={`w-6 h-6 text-[9.5px] font-mono font-bold rounded flex items-center justify-center border cursor-pointer transition-colors ${
                        active ? 'bg-indigo-600 text-white border-indigo-700 font-black' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live computed banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center text-xs font-medium gap-3">
        <div className="space-y-1">
          <span className="text-[9.5px] font-black text-slate-450 uppercase tracking-widest block">Formula-Based Pricing Monitor</span>
          <code className="text-[10px] text-slate-550 font-mono block">
            Teeth count ({countSelected}) &times; Rate (₹{activeRate.toLocaleString()}) &rarr; Gross: ₹{grossAmount.toLocaleString()}
          </code>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-bold text-slate-400 block uppercase">Calculated net item cost (including GST)</span>
          <span className="text-base font-black text-indigo-750 font-mono">₹{Math.round(finalPriceWithGst).toLocaleString()}</span>
        </div>
      </div>

      <button
        id="btn-add-item-to-billings-draft"
        onClick={handleAddProcedureToDraft}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl py-3 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 outline-none shadow-sm"
      >
        <Plus className="h-4 w-4" /> Add Item Line to Billings Table Below
      </button>

      {creatorError && (
        <div className="bg-red-50 border border-red-100 p-3.5 rounded-xl text-[11px] text-red-600 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-550 shrink-0" />
          <span className="font-semibold">{creatorError}</span>
        </div>
      )}

      {creatorSuccess && (
        <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-[11px] text-emerald-700 font-semibold flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{creatorSuccess}</span>
        </div>
      )}

      {/* Billings Draft table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden mt-1 shadow-xs">
        <div className="bg-slate-105 px-4 py-2.5 border-b border-slate-200/80 flex justify-between items-center">
          <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider font-mono">🛒 Active Treatment Draft (Unlocked Billing Lines)</span>
          {draftBillingItems.length > 0 && (
            <span className="text-[9px] bg-slate-900 text-white font-mono rounded px-2 py-0.5 font-bold">
              {draftBillingItems.length} lines
            </span>
          )}
        </div>
        
        {draftBillingItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            No billing lines appended. Formulate a plan by choosing procedures & teeth above.
          </div>
        ) : (
          <div className="overflow-x-auto border-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono text-slate-500 uppercase">
                  <th className="p-3">Tooth No</th>
                  <th className="p-3">Procedure Name</th>
                  <th className="p-3">Base Rate</th>
                  <th className="p-3 text-center">Count</th>
                  <th className="p-3 text-center">Discount %</th>
                  <th className="p-3 text-center">GST %</th>
                  <th className="p-3 text-right font-black">Final Total</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {draftBillingItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 border-0">
                    <td className="p-3 font-mono font-bold text-indigo-700">{item.tooth_no.join(', ')}</td>
                    <td className="p-3 font-semibold text-slate-800">{item.procedure_name}</td>
                    <td className="p-3 font-mono">₹{item.base_rate.toLocaleString()}</td>
                    <td className="p-3 text-center font-mono font-bold">{item.count}</td>
                    <td className="p-3 text-center text-red-650 font-bold">{item.discount_percent}%</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">{item.gst_percent}%</td>
                    <td className="p-3 text-right font-mono font-black text-indigo-900">₹{item.final_total.toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleRemoveDraftItem(idx)}
                        className="text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mode Configuration & LOCK */}
      {draftBillingItems.length > 0 && (
        <div className="bg-slate-50 hover:bg-slate-100/80 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fadeIn transition-colors mt-1 shadow-sm">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block select-none">💳 Payment Mode Selection</label>
            <div className="flex flex-wrap gap-1.5">
              {['Cash', 'UPI', 'EMI', 'Clinic EMI'].map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedPaymentMode(mode)}
                  className={`text-[10px] font-bold px-4 py-2 rounded-xl border transition-all cursor-pointer outline-none ${
                    selectedPaymentMode === mode 
                      ? 'bg-slate-900 text-white border-slate-950 shadow-sm font-extrabold' 
                      : 'bg-white text-slate-650 border-slate-250 hover:bg-slate-55'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="text-right self-stretch md:self-auto flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Draft grand total</span>
            <span className="text-xl font-black text-emerald-700 font-mono leading-none mt-1">₹{draftGrandTotal.toLocaleString()}</span>
            <button
              id="btn-confirm-and-lock-plan"
              onClick={handleLockAndActivatePlan}
              className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-3 rounded-xl border-y border-emerald-650 cursor-pointer shadow-md flex items-center gap-1.5 transition-all outline-none"
            >
              <Lock className="h-3.5 w-3.5 text-white" /> Confirm & Lock Plan
            </button>
          </div>
        </div>
      )}

      {/* Gemini Cognitive Transcript Notes Parser */}
      <div className="border-t border-slate-150 pt-5 flex flex-col gap-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1.5 select-none">
          <Sparkles className="h-4 w-4 text-indigo-500" /> Cognitive Intelligence Transcript Notes Parser
        </label>
        <textarea
          id="ai-transcript-input"
          value={aiInputText}
          onChange={(e) => setAiInputText(e.target.value)}
          placeholder="Paste reception transcripts or doctor logs here (e.g. 'Add procedure Root Canal for Arjun Kapoor tooth 14 and 16. Apply 10% discount and UPI payment completed.')"
          className="w-full text-xs p-3.5 bg-slate-5/50 border border-slate-200 rounded-2xl h-24 resize-none text-slate-850 focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-serif"
        />
        <button
          id="ai-transcript-submit-btn"
          onClick={handleAISubmit}
          disabled={aiLoading}
          className="w-full bg-slate-900 border-0 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          {aiLoading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-white flex-shrink-0" />
          ) : (
            <Sparkles className="h-4 w-4 text-indigo-450 flex-shrink-0" />
          )}
          Submit Entry to Clinical AI Engine
        </button>
      </div>

      {/* Wizard Navigation Footer */}
      <div className="border-t border-slate-100 pt-5 flex justify-between">
        <button
          id="wizard-move-back-to-tab-c"
          onClick={onPrevStep}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-3.5 rounded-xl cursor-pointer border-0 transition-all outline-none"
        >
          ⬅️ Back to Chat Log
        </button>
        <button
          id="wizard-move-to-tab-e"
          onClick={onNextStep}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-6 py-3.5 rounded-xl shadow-md cursor-pointer border-0 flex items-center gap-1.5 transition-all outline-none"
        >
          ➡️ Next Step: View Clinical Execution Dashboard
        </button>
      </div>

    </div>
  );
}
