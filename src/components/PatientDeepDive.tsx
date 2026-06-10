import React from 'react';
import { 
  ArrowLeft, 
  Activity, 
  Sparkles, 
  Send, 
  RefreshCw,
  Info,
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  User, 
  Users, 
  Check, 
  Lock, 
  PlusCircle, 
  Calendar,
  ShieldAlert
} from 'lucide-react';
import { Patient, PatientStage, BillingItem, VisitLog, TreatmentPlan } from '../types';

interface PatientDeepDiveProps {
  selectedPatient: Patient;
  onBackToDirectory: () => void;
  onUpdateStage: (patient: Patient, nextStage: PatientStage) => void;
  SYSTEM_DENTAL_PROCEDURES: Array<{ id: string; name: string; rate: number }>;
  selectedPredefinedId: string;
  setSelectedPredefinedId: (val: string) => void;
  customTreatmentName: string;
  setCustomTreatmentName: (val: string) => void;
  customTreatmentRate: number;
  setCustomTreatmentRate: (val: number) => void;
  selectedTeeth: number[];
  onToggleTooth: (tooth: number) => void;
  onSelectAllTeeth: () => void;
  onClearTeeth: () => void;
  handleApplyTreatmentPlan: () => void;
  aiInputText: string;
  setAiInputText: (val: string) => void;
  handleAISubmit: () => void;
  aiLoading: boolean;
  onAppendNote: (noteText: string) => Promise<void>;
}

// Age extraction utility inside component
const getPatientAgeValue = (ageStr?: string): number => {
  if (!ageStr) return 30;
  const match = ageStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 30;
};

// Static FDI listings
const FDI_ADULT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const FDI_ADULT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const FDI_ADULT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
const FDI_ADULT_LOWER_RIGHT = [41, 42, 43, 44, 45, 46, 47, 48];

const FDI_CHILD_UPPER_LEFT = [51, 52, 53, 54, 55];
const FDI_CHILD_UPPER_RIGHT = [61, 62, 63, 64, 65];
const FDI_CHILD_LOWER_LEFT = [71, 72, 73, 74, 75];
const FDI_CHILD_LOWER_RIGHT = [81, 82, 83, 84, 85];

export default function PatientDeepDive({
  selectedPatient,
  onBackToDirectory,
  onUpdateStage,
  SYSTEM_DENTAL_PROCEDURES,
  selectedPredefinedId,
  setSelectedPredefinedId,
  customTreatmentName,
  setCustomTreatmentName,
  customTreatmentRate,
  setCustomTreatmentRate,
  selectedTeeth,
  onToggleTooth,
  onSelectAllTeeth,
  onClearTeeth,
  handleApplyTreatmentPlan,
  aiInputText,
  setAiInputText,
  handleAISubmit,
  aiLoading,
  onAppendNote
}: PatientDeepDiveProps) {
  const patientAge = getPatientAgeValue(selectedPatient.age_dob);
  const isChild = patientAge <= 13;

  // Active creator and visit states
  const [draftBillingItems, setDraftBillingItems] = React.useState<BillingItem[]>([]);
  const [selectedPaymentMode, setSelectedPaymentMode] = React.useState<string>('Not Selected');
  const [discountPercent, setDiscountPercent] = React.useState<number>(0);
  const [gstPercent, setGstPercent] = React.useState<number>(18); // Default 18% GST standard

  // Simulated Popup Trigger States
  const [showCustomPopup, setShowCustomPopup] = React.useState<boolean>(false);
  const [customPopupName, setCustomPopupName] = React.useState<string>('');
  const [customPopupRate, setCustomPopupRate] = React.useState<number>(5000);
  const [customPopupDiscount, setCustomPopupDiscount] = React.useState<number>(10);
  const [customPopupGst, setCustomPopupGst] = React.useState<number>(18);

  // Core CRM arrays persist
  const [activeTreatmentPlans, setActiveTreatmentPlans] = React.useState<TreatmentPlan[]>(
    selectedPatient.active_treatment_plans || []
  );

  const [localNote, setLocalNote] = React.useState('');
  const [creatorError, setCreatorError] = React.useState<string>('');
  const [creatorSuccess, setCreatorSuccess] = React.useState<string>('');

  // Visit log state trigger
  const [loggingPlanId, setLoggingPlanId] = React.useState<string | null>(null);
  const [visitStep, setVisitStep] = React.useState<string>('Access Opening');
  const [visitTeethLog, setVisitTeethLog] = React.useState<number[]>([]);
  const [visitConductedBy, setVisitConductedBy] = React.useState<string>('Dr. Sarah Jenkins');
  const [visitAssistedBy, setVisitAssistedBy] = React.useState<string>('Nurse Sarah');
  const [visitRemarks, setVisitRemarks] = React.useState<string>('');

  React.useEffect(() => {
    setActiveTreatmentPlans(selectedPatient.active_treatment_plans || []);
    if (selectedPatient.selected_payment_mode) {
      setSelectedPaymentMode(selectedPatient.selected_payment_mode);
    }
  }, [selectedPatient]);

  // Calculations for current interactive row
  const currentPredefined = SYSTEM_DENTAL_PROCEDURES.find(p => p.id === selectedPredefinedId);
  const activeRate = selectedPredefinedId === 'custom' ? customPopupRate : (currentPredefined?.rate || 0);
  
  // Calculate pricing
  const countSelected = selectedTeeth.length;
  const grossAmount = activeRate * countSelected;
  const discountedAmount = grossAmount - (grossAmount * (discountPercent / 100));
  const finalPriceWithGst = discountedAmount + (discountedAmount * (gstPercent / 100));

  const submitLocalNote = async () => {
    if (!localNote.trim()) return;
    await onAppendNote(localNote);
    setLocalNote('');
  };

  // Add Item to Draft table
  const handleAddProcedureToDraft = () => {
    if (selectedTeeth.length === 0) {
      setCreatorError('Choose at least one tooth from the FDI coordinate map first.');
      return;
    }
    setCreatorError('');

    let name = '';
    let rate = 0;

    if (selectedPredefinedId === 'custom') {
      name = customTreatmentName || 'Custom Procedure';
      rate = customTreatmentRate;
    } else {
      name = currentPredefined?.name || 'Procedure';
      rate = currentPredefined?.rate || 0;
    }

    const count = selectedTeeth.length;
    const gross = rate * count;
    const discounted = gross - (gross * (discountPercent / 100));
    const finalTotal = discounted + (discounted * (gstPercent / 100));

    const item: BillingItem = {
      tooth_no: [...selectedTeeth],
      procedure_name: name,
      base_rate: rate,
      count,
      discount_percent: discountPercent,
      gst_percent: gstPercent,
      final_total: Math.round(finalTotal)
    };

    setDraftBillingItems(prev => [...prev, item]);
    onClearTeeth();
    setCreatorSuccess('Item injected into Billings Draft Creator below!');
    setTimeout(() => setCreatorSuccess(''), 3000);
  };

  // Trigger Custom Popup simulation injection
  const handleInjectCustomPopup = () => {
    if (!customPopupName.trim()) {
      alert('Specify procedure name.');
      return;
    }
    if (selectedTeeth.length === 0) {
      alert('Choose at least one tooth from FDI chart first.');
      return;
    }

    const count = selectedTeeth.length;
    const gross = customPopupRate * count;
    const discounted = gross - (gross * (customPopupDiscount / 100));
    const finalTotal = discounted + (discounted * (customPopupGst / 100));

    const item: BillingItem = {
      tooth_no: [...selectedTeeth],
      procedure_name: customPopupName,
      base_rate: customPopupRate,
      count,
      discount_percent: customPopupDiscount,
      gst_percent: customPopupGst,
      final_total: Math.round(finalTotal)
    };

    setDraftBillingItems(prev => [...prev, item]);
    onClearTeeth();
    setShowCustomPopup(false);
    setCustomPopupName('');
    setCreatorSuccess(`Simulated pop-up: Injected "${customPopupName}" workflow billing instantly!`);
    setTimeout(() => setCreatorSuccess(''), 3500);
  };

  // Remove billing draft item
  const handleRemoveDraftItem = (index: number) => {
    setDraftBillingItems(prev => prev.filter((_, i) => i !== index));
  };

  // Lock Clinical Treatment Plan & transition status beautifully
  const handleLockAndActivatePlan = async () => {
    if (draftBillingItems.length === 0) {
      setCreatorError('Your Billings Table is empty. Add a procedure first to formulate a plan.');
      return;
    }
    if (selectedPaymentMode === 'Not Selected') {
      setCreatorError('Locked stage requires Payment Mode Assigned: Cash, UPI, EMI, or Clinic EMI.');
      return;
    }
    setCreatorError('');

    // Formulate new parallel treatment plan
    const firstProcName = draftBillingItems[0]?.procedure_name || 'Procedural Bundle';
    const planName = draftBillingItems.length > 1 ? `${firstProcName} Combo Plan` : `${firstProcName} Plan`;
    
    const newPlan: TreatmentPlan = {
      plan_id: 'plan_' + Math.floor(1000 + Math.random() * 9000),
      plan_name: planName,
      status: 'Treatment in Progress',
      billing_items: [...draftBillingItems],
      visit_logs: []
    };

    const finalBillTotal = draftBillingItems.reduce((acc, item) => acc + item.final_total, 0);
    const updatedPlans = [...activeTreatmentPlans, newPlan];

    // Transition state rules automatically to Treatment in Progress
    const nextStage: PatientStage = 'STAGE_4: TREATMENT_ACCEPTED';
    const timelineNote = `Logged by billing system | Treatment Plan "${planName}" locked and activated with mode: ${selectedPaymentMode}. Total computed financials: ₹${finalBillTotal.toLocaleString()} (compounded with Discounts & GST values). State auto-transitioned to 🟢 Treatment in Progress.`;

    const updatedPatient: Patient = {
      ...selectedPatient,
      current_stage: nextStage,
      selected_payment_mode: selectedPaymentMode,
      active_treatment_plans: updatedPlans,
      history: [...(selectedPatient.history || []), timelineNote],
      financials: {
        total_cost: finalBillTotal,
        payment_mode: selectedPaymentMode,
        payment_status: selectedPaymentMode.includes('EMI') ? 'Active EMI' : 'Partially Paid',
        emi_months: selectedPaymentMode.includes('EMI') ? 6 : 0,
        emi_monthly_amount: selectedPaymentMode.includes('EMI') ? Math.round(finalBillTotal / 6) : 0
      }
    };

    try {
      const res = await fetch('/api/patients/update-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient)
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTreatmentPlans(updatedPlans);
        setDraftBillingItems([]);
        onUpdateStage(data.patient, nextStage);
        setCreatorSuccess('Success! Treatment Plan formulated and locked. Client status: Treatment in Progress.');
        setTimeout(() => setCreatorSuccess(''), 5000);
      }
    } catch (err) {
      console.error('Error locking plans: ', err);
      setCreatorError('Network persistence error occurred.');
    }
  };

  // Add a clinical execution visit log
  const handleAppendVisitLog = async (planId: string) => {
    if (!visitStep.trim()) {
      alert('Specify procedure step.');
      return;
    }

    const planObj = activeTreatmentPlans.find(p => p.plan_id === planId);
    if (!planObj) return;

    const visitNumStr = `V${planObj.visit_logs.length + 1}`;
    const newLog: VisitLog = {
      visit_id: 'visit_' + Math.floor(1000 + Math.random() * 9000),
      visit_number: visitNumStr,
      date: new Date().toISOString().split('T')[0],
      procedure_step: visitStep,
      assigned_teeth: visitTeethLog.length > 0 ? visitTeethLog : planObj.billing_items.flatMap(b => b.tooth_no),
      conducted_by: visitConductedBy,
      assisted_by: visitAssistedBy,
      remarks: visitRemarks || 'Progress clean & stable.'
    };

    const updatedPlans = activeTreatmentPlans.map(p => {
      if (p.plan_id === planId) {
        return {
          ...p,
          visit_logs: [...p.visit_logs, newLog]
        };
      }
      return p;
    });

    const timelineNote = `Logged by Junior Doctor | Injected visit ${visitNumStr} for plan "${planObj.plan_name}" executing step "${visitStep}". Conducted by ${visitConductedBy}.`;

    const updatedPatient: Patient = {
      ...selectedPatient,
      active_treatment_plans: updatedPlans,
      history: [...(selectedPatient.history || []), timelineNote]
    };

    try {
      const res = await fetch('/api/patients/update-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient)
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTreatmentPlans(updatedPlans);
        setLoggingPlanId(null);
        setVisitStep('Access Opening');
        setVisitTeethLog([]);
        setVisitRemarks('');
        onUpdateStage(data.patient, selectedPatient.current_stage);
      }
    } catch (err) {
      console.error('Failed visit log: ', err);
    }
  };

  // Independent Plan Closure Rule (mark status as Treatment Done & freeze logs)
  const handleMarkPlanStatusDone = async (planId: string, statusText: 'Treatment in Progress' | 'Treatment Done') => {
    const planObj = activeTreatmentPlans.find(p => p.plan_id === planId);
    if (!planObj) return;

    const updatedPlans = activeTreatmentPlans.map(p => {
      if (p.plan_id === planId) {
        return { ...p, status: statusText };
      }
      return p;
    });

    const timelineNote = `Logged by Dr. Jenkins | Swapped Treatment Plan "${planObj.plan_name}" lifecycle to ✅ ${statusText}. Logs locked.`;

    const updatedPatient: Patient = {
      ...selectedPatient,
      active_treatment_plans: updatedPlans,
      history: [...(selectedPatient.history || []), timelineNote]
    };

    try {
      const res = await fetch('/api/patients/update-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient)
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTreatmentPlans(updatedPlans);
        onUpdateStage(data.patient, selectedPatient.current_stage);
      }
    } catch (err) {
      console.error('Failed status flip: ', err);
    }
  };

  // Grand Billing total count
  const draftGrandTotal = draftBillingItems.reduce((acc, item) => acc + item.final_total, 0);

  // Architectural JSON payload structure
  const statePayload = {
    patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
    lifecycle_stage: selectedPatient.current_stage,
    payment_mode: selectedPaymentMode,
    active_treatment_plans: activeTreatmentPlans
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn pb-12 font-sans text-slate-800">
      
      {/* Header back bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDirectory}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border-0 outline-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Directory
          </button>
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 font-display">
              <Activity className="h-5 w-5 text-indigo-600 animate-pulse" />
              Patient Dossier: <span className="text-indigo-700">{selectedPatient.first_name} {selectedPatient.last_name}</span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-1">
              Status Flag check: <span className="font-bold text-emerald-600">🟢 Treatment in Progress Tracker (Visit-Level Execution Active)</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-100 flex items-center gap-1.5">
            💳 LIFECYCLE: {selectedPatient.current_stage}
          </span>
          <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl">
            {selectedPaymentMode === 'Not Selected' ? 'Draft' : `MODE: ${selectedPaymentMode}`}
          </span>
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Section A, B, C */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* SECTION A: Personal & Demographics File */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 font-mono flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Section A: Demographics Profile
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">First Name</span>
                <span className="font-bold text-slate-800">{selectedPatient.first_name}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Last Name</span>
                <span className="font-bold text-slate-800">{selectedPatient.last_name}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gender Identity</span>
                <span className="font-bold text-slate-800">{selectedPatient.gender}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Age / DoB</span>
                <span className="font-bold text-slate-800">{selectedPatient.age_dob}</span>
              </div>
            </div>
          </div>

          {/* SECTION B: Lifecycle Stage Tracker */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                Section B: Lifecycle Stage
              </h3>
            </div>

            <div className="flex flex-col gap-1.5">
              {[
                { key: 'STAGE_1: FOLLOW_UP' as PatientStage, label: 'STAGE 1: FOLLOW UP' },
                { key: 'STAGE_2: APPOINTMENT_SCHEDULED' as PatientStage, label: 'STAGE 2: APPOINTMENT SCHEDULED' },
                { key: 'STAGE_3: TREATMENT_PLAN_SHARED' as PatientStage, label: 'STAGE 3: PLAN SHARED' },
                { key: 'STAGE_4: TREATMENT_ACCEPTED' as PatientStage, label: 'STAGE 4: PLAN ACCEPTED' },
                { key: 'STAGE_5: PAYMENT_COMPLETED' as PatientStage, label: 'STAGE 5: EMI ACTIVE / PAID' },
              ].map((st) => {
                const isActive = selectedPatient.current_stage === st.key;
                return (
                  <div
                    key={st.key}
                    onClick={() => onUpdateStage(selectedPatient, st.key)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-slate-900 border-slate-800 text-white shadow-sm font-bold' 
                        : 'bg-slate-50 hover:bg-slate-100/75 border-slate-200 text-slate-650 font-medium'
                    }`}
                  >
                    <span className="text-[10px] font-mono tracking-wider">{st.label}</span>
                    {isActive && (
                      <span className="text-[8px] uppercase bg-indigo-600 text-white px-2 py-0.5 rounded font-black font-mono animate-pulse">
                        Active Case State
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION C: Centralized Interaction Log */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 font-mono flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Section C: Clinical Case Diary
            </h3>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {selectedPatient.history && selectedPatient.history.length > 0 ? (
                selectedPatient.history.map((logLine, index) => {
                  let persona = "Staff Operations";
                  let noteDetails = logLine;
                  if (logLine.includes('|')) {
                    const parts = logLine.split('|');
                    persona = parts[0].trim();
                    noteDetails = parts.slice(1).join('|').trim();
                  }

                  return (
                    <div 
                      key={index} 
                      className="p-3 bg-slate-50 text-slate-800 rounded-xl border border-slate-200/60 flex flex-col gap-1.5 animate-fadeIn"
                    >
                      <div className="flex items-center justify-between leading-none">
                        <span className="text-[10px] font-mono text-indigo-700 font-extrabold uppercase">
                          [{persona.replace('Logged by', '').trim()}]
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono">Dossier Step #{index + 1}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-serif leading-relaxed">{noteDetails}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic">No historical timeline logs recorded yet.</p>
              )}
            </div>

            {/* Quick manual note append */}
            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Quick Append Note</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Type dentist note..."
                  value={localNote}
                  onChange={(e) => setLocalNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitLocalNote();
                  }}
                  className="flex-1 bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                />
                <button 
                  onClick={submitLocalNote}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-2 rounded-xl text-xs cursor-pointer border-0"
                >
                  Log
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: FDI Tooth Planner & Billings */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Section D: Active Treatment Plan Creator & Billings Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Section D: Active Plan Creator & Billings Table
              </h3>
              <button 
                onClick={() => setShowCustomPopup(true)}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
              >
                <Plus className="h-3 w-3" /> [Simulated Pop-up Trigger]
              </button>
            </div>

            {/* Selector Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block mb-1">1. Select Procedure</label>
                <select
                  value={selectedPredefinedId}
                  onChange={(e) => {
                    setSelectedPredefinedId(e.target.value);
                    if (e.target.value === 'custom') {
                      setShowCustomPopup(true);
                    }
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-semibold text-slate-850"
                >
                  <optgroup label="Auto-Billing Systems Catalog">
                    {SYSTEM_DENTAL_PROCEDURES.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.rate.toLocaleString()}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Manual Entry options">
                    <option value="custom">⚙ Click to trigger custom simulation pop-up</option>
                  </optgroup>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block mb-1">Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full text-xs bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-slate-800 text-center font-bold"
                />
              </div>

              <div className="md:col-span-4">
                <label className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block mb-1">GST %</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={gstPercent}
                    onChange={(e) => setGstPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-2/5 text-xs bg-slate-50 border border-slate-250 rounded-xl py-2.5 text-slate-850 text-center font-bold"
                  />
                  <div className="grid grid-cols-3 gap-0.5 w-3/5 font-mono text-[9px]">
                    {[0, 12, 18].map(pst => (
                      <button
                        key={pst}
                        type="button"
                        onClick={() => setGstPercent(pst)}
                        className={`py-2 rounded border transition-colors ${gstPercent === pst ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'}`}
                      >
                        {pst}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tooth selection map */}
            <div className="border border-slate-200/70 p-4 rounded-xl bg-slate-50/50">
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <label className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block">2. Select tooth numbers</label>
                <div className="flex gap-2 font-mono text-[9px]">
                  <button onClick={onSelectAllTeeth} className="text-indigo-650 hover:underline border-0 bg-transparent cursor-pointer font-bold">Select All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={onClearTeeth} className="text-slate-500 hover:underline border-0 bg-transparent cursor-pointer font-bold">Clear All</button>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                Rendered map: <span className="font-bold text-slate-700">{isChild ? "Children FDI Charting (51–85)" : "Adults FDI Charting (11–48)"}</span> based on patient age of <span className="font-bold text-indigo-600">{patientAge} years old</span>.
              </p>

              {/* FDI Grid Map rendering */}
              <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">Upper Maxilla</div>
                <div className="grid grid-cols-2 gap-3 border-b border-slate-200/80 pb-2">
                  <div className="text-right border-r border-dashed border-slate-200 pr-1">
                    <span className="text-[7.5px] font-bold text-slate-400 block mb-0.5">Quadrant UR</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {(isChild ? FDI_CHILD_UPPER_RIGHT : FDI_ADULT_UPPER_RIGHT).map(t => {
                        const active = selectedTeeth.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => onToggleTooth(t)}
                            className={`w-6 h-6 text-[9.5px] font-mono font-bold rounded flex items-center justify-center border cursor-pointer transition-colors ${
                              active ? 'bg-indigo-600 text-white border-indigo-750 font-black' : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-left pl-1">
                    <span className="text-[7.5px] font-bold text-slate-400 block mb-0.5">Quadrant UL</span>
                    <div className="flex flex-wrap gap-1">
                      {(isChild ? FDI_CHILD_UPPER_LEFT : FDI_ADULT_UPPER_LEFT).map(t => {
                        const active = selectedTeeth.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => onToggleTooth(t)}
                            className={`w-6 h-6 text-[9.5px] font-mono font-bold rounded flex items-center justify-center border cursor-pointer transition-colors ${
                              active ? 'bg-indigo-600 text-white border-indigo-750 font-black' : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center mt-1">Lower Mandible</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-right border-r border-dashed border-slate-200 pr-1">
                    <span className="text-[7.5px] font-bold text-slate-400 block mb-0.5">Quadrant LR</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {(isChild ? FDI_CHILD_LOWER_RIGHT : FDI_ADULT_LOWER_RIGHT).map(t => {
                        const active = selectedTeeth.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => onToggleTooth(t)}
                            className={`w-6 h-6 text-[9.5px] font-mono font-bold rounded flex items-center justify-center border cursor-pointer transition-colors ${
                              active ? 'bg-indigo-600 text-white border-indigo-750 font-black' : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-left pl-1">
                    <span className="text-[7.5px] font-bold text-slate-400 block mb-0.5">Quadrant LL</span>
                    <div className="flex flex-wrap gap-1">
                      {(isChild ? FDI_CHILD_LOWER_LEFT : FDI_ADULT_LOWER_LEFT).map(t => {
                        const active = selectedTeeth.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => onToggleTooth(t)}
                            className={`w-6 h-6 text-[9.5px] font-mono font-bold rounded flex items-center justify-center border cursor-pointer transition-colors ${
                              active ? 'bg-indigo-600 text-white border-indigo-750 font-black' : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-100'
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

            {/* Computations Formulas Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row justify-between items-start md:items-center text-xs font-medium gap-3">
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formula-based pricing monitor</p>
                <code className="text-[10px] text-slate-500 font-mono italic">
                  Count ({countSelected} teeth) &times; Rate (₹{activeRate.toLocaleString()}) &rarr; Gross: ₹{grossAmount.toLocaleString()}
                </code>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-450 block uppercase">Calculated net item cost (inc. GST)</span>
                <span className="text-sm font-black text-indigo-700 font-mono">₹{Math.round(finalPriceWithGst).toLocaleString()}</span>
              </div>
            </div>

            {/* Trigger Addition row */}
            <button
              onClick={handleAddProcedureToDraft}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl py-2.5 text-xs transition-all flex items-center justify-center gap-1 cursor-pointer border-0 outline-none"
            >
              <Plus className="h-4 w-4" /> Add Item Line to Billings Table Below
            </button>

            {/* Error alerts */}
            {creatorError && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-[11px] text-red-600 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
                <span className="font-semibold">{creatorError}</span>
              </div>
            )}

            {creatorSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-[11px] text-emerald-700 font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{creatorSuccess}</span>
              </div>
            )}

            {/* Billings Draft table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                <span className="text-[10px] font-bold text-slate-650 uppercase tracking-wider font-mono">🛒 Active Treatment Draft (Unlocked billing lines)</span>
              </div>
              
              {draftBillingItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-405 italic">
                  No billing lines appended. Formulate a plan by choosing procedures & teeth above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-250 text-[10px] font-mono text-slate-500 uppercase">
                        <th className="p-3">Tooth No</th>
                        <th className="p-3">Procedure Name</th>
                        <th className="p-3">Base Rate</th>
                        <th className="p-3 text-center">Count</th>
                        <th className="p-3 text-center">Discount %</th>
                        <th className="p-3 text-center">GST %</th>
                        <th className="p-3 text-right">Final Total</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {draftBillingItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-indigo-700">{item.tooth_no.join(', ')}</td>
                          <td className="p-3 font-bold text-slate-800">{item.procedure_name}</td>
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
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Billing Mode assignment & activate lock */}
            {draftBillingItems.length > 0 && (
              <div className="bg-slate-50 hover:bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fadeIn">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">💳 Mode Assignment & Grand Total</label>
                  <div className="flex flex-wrap gap-1">
                    {['Cash', 'UPI', 'EMI', 'Clinic EMI'].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSelectedPaymentMode(mode)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                          selectedPaymentMode === mode 
                            ? 'bg-slate-900 text-white border-slate-950 shadow-sm' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Grand Billing Total</span>
                  <span className="text-base font-black text-emerald-700 font-mono">₹{draftGrandTotal.toLocaleString()}</span>
                  <button
                    onClick={handleLockAndActivatePlan}
                    className="mt-2 block bg-emerald-600 hover:bg-emerald-705 text-white font-black text-[11px] px-4.5 py-2 rounded-xl border-y border-emerald-650 cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    <Lock className="h-3 w-3 text-emerald-205" /> Confirm & Lock Plan
                  </button>
                </div>
              </div>
            )}

            {/* Gemini Transcript Assist Co-pilot */}
            <div className="border-t border-slate-200 pt-4 flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Cognitive Intelligence Transcript Notes Parser
              </label>
              <textarea
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                placeholder="Paste reception transcripts or clinical notes to autocompile the lifecycle cards (e.g., 'Configure custom procedure Root Canal for Rahul teeth 22 and 23. base cost 6000. Apply 10% discount and UPI payment completed.')"
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl h-20 resize-none text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-indigo-550 leading-relaxed font-serif"
              />
              <button
                onClick={handleAISubmit}
                disabled={aiLoading}
                className="w-full bg-slate-900 border-0 hover:bg-slate-850 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {aiLoading ? (
                  <RefreshCw className="h-3 w-3 animate-spin text-white" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                )}
                Submit Entry to Clinical AI Engine
              </button>
            </div>

          </div>

          {/* Section E: Ongoing Clinical Execution Dashboard (Treatment in Progress) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2 font-mono flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-emerald-500" />
              Section E: Ongoing Clinical Execution Dashboard (Treatment in Progress)
            </h3>

            {activeTreatmentPlans.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-450 italic border border-dashed border-slate-250 bg-slate-50 rounded-2xl">
                No active running treatment plans launched yet. Add items and lock a plan above to initiate tracking!
              </div>
            ) : (
              <div className="space-y-6">
                {activeTreatmentPlans.map((plan) => {
                  const isInProgress = plan.status === 'Treatment in Progress';
                  return (
                    <div 
                      key={plan.plan_id} 
                      className={`border p-4.5 rounded-2xl flex flex-col gap-4 relative transition-all ${
                        isInProgress ? 'bg-indigo-50/20 border-indigo-150' : 'bg-slate-50 border-slate-200 opacity-90'
                      }`}
                    >
                      {/* Card status bar */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/60 pb-3">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-black text-slate-850 flex items-center gap-1.5 font-display uppercase tracking-tight">
                            📂 {plan.plan_name}
                          </h4>
                          <span className="text-[9px] font-mono text-slate-400 block font-bold">PLAN ID: {plan.plan_id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold px-2 rounded-lg py-1 flex items-center gap-1 border ${
                            isInProgress 
                              ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {isInProgress ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                            {plan.status}
                          </span>
                          
                          {isInProgress ? (
                            <button
                              onClick={() => handleMarkPlanStatusDone(plan.plan_id, 'Treatment Done')}
                              className="text-[9.5px] font-black bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg border-0 cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <CheckCircle className="h-3 w-3 text-white" /> Complete Plan ✅
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono italic">frozen-logs</span>
                          )}
                        </div>
                      </div>

                      {/* Display plan's billing line summary */}
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Procedure Bundle Details:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.billing_items.map((b, idx) => (
                            <span key={idx} className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-medium text-slate-700">
                              Tooth {b.tooth_no.join(', ')} &rarr; <span className="font-bold">{b.procedure_name}</span> (₹{b.final_total.toLocaleString()})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Visit Log Table per plan */}
                      <div className="space-y-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block font-mono">🩺 Clinicians Interaction & Visit Logs:</span>
                        
                        {plan.visit_logs.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic bg-white/70 p-3 rounded-xl border border-dashed border-slate-200">
                            No active visitation logs. Perform the clinical diagnostic evaluation and record the first visit step block below!
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px] bg-white rounded-xl overflow-hidden border border-slate-200">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 font-mono text-slate-500">
                                  <th className="p-2 w-12 text-center">Visit #</th>
                                  <th className="p-2 w-24">Date</th>
                                  <th className="p-2">Executed Step</th>
                                  <th className="p-2 text-center w-20">Teeth</th>
                                  <th className="p-2">Operator</th>
                                  <th className="p-2">Assisted By</th>
                                  <th className="p-2">Clinical Notes & Remarks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150">
                                {plan.visit_logs.map((visit) => (
                                  <tr key={visit.visit_id} className="hover:bg-slate-50/50">
                                    <td className="p-2 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40">{visit.visit_number}</td>
                                    <td className="p-2 font-mono text-slate-500">{visit.date}</td>
                                    <td className="p-2 font-bold text-slate-800">{visit.procedure_step}</td>
                                    <td className="p-2 text-center font-mono bg-slate-50">{visit.assigned_teeth.join(', ')}</td>
                                    <td className="p-2 font-medium">{visit.conducted_by}</td>
                                    <td className="p-2 text-slate-600">{visit.assisted_by || 'N/A'}</td>
                                    <td className="p-2 italic text-slate-500 font-serif">{visit.remarks}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Form to append visit - only if active */}
                      {isInProgress && (
                        <div className="bg-white/80 border border-dashed border-indigo-150 p-4 rounded-xl flex flex-col gap-3">
                          <div className="flex items-center gap-1 text-[10px] font-black text-indigo-700 uppercase tracking-widest leading-none">
                            <PlusCircle className="h-4 w-4" /> Log Next Visit (V{plan.visit_logs.length + 1})
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                            <div className="sm:col-span-4 flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Procedure step</span>
                              <select 
                                value={visitStep}
                                onChange={(e) => setVisitStep(e.target.value)}
                                className="bg-slate-50 p-1.5 rounded border border-slate-200 outline-none text-xs font-semibold text-slate-800"
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
                                className="bg-slate-50 p-1.5 rounded border border-slate-200 outline-none text-xs font-medium text-slate-800"
                              />
                            </div>

                            <div className="sm:col-span-4 flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Assistant Staff</span>
                              <input 
                                type="text"
                                value={visitAssistedBy}
                                onChange={(e) => setVisitAssistedBy(e.target.value)}
                                className="bg-slate-50 p-1.5 rounded border border-slate-200 outline-none text-xs text-slate-800"
                              />
                            </div>

                            <div className="sm:col-span-9 flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Clinical progress remarks / notes</span>
                              <input 
                                type="text"
                                placeholder="Patient reported zero post-op sensitivity, clean status..."
                                value={visitRemarks}
                                onChange={(e) => setVisitRemarks(e.target.value)}
                                className="bg-slate-50 p-1.5 rounded border border-slate-200 outline-none text-xs placeholder-slate-400 font-serif text-slate-755"
                              />
                            </div>

                            <div className="sm:col-span-3 flex items-end">
                              <button
                                onClick={() => handleAppendVisitLog(plan.plan_id)}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 rounded-lg border-0 cursor-pointer text-xs"
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
          </div>

        </div>

      </div>

      {/* Simulated Pop-up Modal */}
      {showCustomPopup && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-5 flex flex-col gap-4 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-600 animate-spin" /> Simulated Pop-up: Add Custom Treatment
              </h3>
              <button 
                onClick={() => setShowCustomPopup(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold bg-transparent border-0 cursor-pointer px-2"
              >
                &times;
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              You are adding a procedure outside our baseline catalog. Fill in details below. Row total will calculate automatically with the selecting teeth count: <span className="font-bold text-indigo-600 font-mono">[{selectedTeeth.length} teeth]</span>.
            </p>

            <div className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Procedure / Treatment Name</span>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Laser Gingivectomy"
                  value={customPopupName}
                  onChange={(e) => setCustomPopupName(e.target.value)}
                  className="bg-slate-50 p-2.5 rounded-xl border border-slate-250 outline-none text-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Base Rate (₹)</span>
                  <input 
                    type="number" 
                    required
                    value={customPopupRate}
                    onChange={(e) => setCustomPopupRate(Number(e.target.value))}
                    className="bg-slate-50 p-2.5 rounded-xl border border-slate-250 outline-none font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Discount %</span>
                  <input 
                    type="number" 
                    value={customPopupDiscount}
                    onChange={(e) => setCustomPopupDiscount(Number(e.target.value))}
                    className="bg-slate-50 p-2.5 rounded-xl border border-slate-250 outline-none text-slate-705 font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">GST %</span>
                  <input 
                    type="number" 
                    value={customPopupGst}
                    onChange={(e) => setCustomPopupGst(Number(e.target.value))}
                    className="bg-slate-50 p-2.5 rounded-xl border border-slate-250 outline-none text-slate-705 font-bold"
                  />
                </div>
              </div>

              {/* Dynamic computed row total for review */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 flex justify-between items-center text-[11px] font-medium leading-none">
                <span className="text-slate-400 font-bold uppercase">Dynamic computed total</span>
                <span className="font-mono text-indigo-700 font-black">
                  ₹{Math.round((customPopupRate * selectedTeeth.length - (customPopupRate * selectedTeeth.length * (customPopupDiscount / 100))) * (1 + customPopupGst/100)).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button 
                type="button"
                onClick={() => {
                  setShowCustomPopup(false);
                  setCustomPopupName('');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer border-0"
              >
                Reset / Cancel
              </button>
              <button 
                onClick={handleInjectCustomPopup}
                className="bg-indigo-600 hover:bg-indigo-705 text-white font-black px-4 py-2 rounded-xl text-xs cursor-pointer border-0 shadow-sm"
              >
                Inject Procedure to Plan ➕
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
