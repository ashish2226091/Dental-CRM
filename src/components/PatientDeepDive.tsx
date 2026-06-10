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
  ShieldAlert,
  Printer,
  FileText,
  RotateCcw
} from 'lucide-react';
import { Patient, PatientStage, BillingItem, VisitLog, TreatmentPlan } from '../types';
import DossierHeader from './DossierHeader';
import TabBillings from './TabBillings';
import TabExecution from './TabExecution';

interface PatientDeepDiveProps {
  selectedPatient: Patient;
  activeTab?: 'PLAN' | 'PROGRESS';
  onChangeTab?: (tab: 'PLAN' | 'PROGRESS') => void;
  showPrintPreview?: boolean;
  setShowPrintPreview?: (show: boolean) => void;
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

const getPatientAgeValue = (ageStr?: string): number => {
  if (!ageStr) return 30;
  const match = ageStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 30;
};

export default function PatientDeepDive({
  selectedPatient,
  activeTab,
  onChangeTab,
  showPrintPreview,
  setShowPrintPreview,
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

  // Local fallback states if props not supplied
  const [internalActiveTab, setInternalActiveTab] = React.useState<'PLAN' | 'PROGRESS'>('PLAN');
  const [internalShowPrintPreview, setInternalShowPrintPreview] = React.useState<boolean>(false);

  const currentTab = activeTab || internalActiveTab;
  const currentShowPrintPreview = showPrintPreview !== undefined ? showPrintPreview : internalShowPrintPreview;

  const setCurrentTab = (val: 'PLAN' | 'PROGRESS') => {
    if (onChangeTab) {
      onChangeTab(val);
    } else {
      setInternalActiveTab(val);
    }
  };

  const setCurrentShowPrintPreview = (val: boolean) => {
    if (setShowPrintPreview) {
      setShowPrintPreview(val);
    } else {
      setInternalShowPrintPreview(val);
    }
  };

  // Active creator and visit states
  const [draftBillingItems, setDraftBillingItems] = React.useState<BillingItem[]>([]);
  const [selectedPaymentMode, setSelectedPaymentMode] = React.useState<string>('Not Selected');
  const [discountPercent, setDiscountPercent] = React.useState<number>(0);
  const [gstPercent, setGstPercent] = React.useState<number>(18);

  const [showCustomPopup, setShowCustomPopup] = React.useState<boolean>(false);
  const [customPopupName, setCustomPopupName] = React.useState<string>('');
  const [customPopupRate, setCustomPopupRate] = React.useState<number>(5000);
  const [customPopupDiscount, setCustomPopupDiscount] = React.useState<number>(10);
  const [customPopupGst, setCustomPopupGst] = React.useState<number>(18);

  const [activeTreatmentPlans, setActiveTreatmentPlans] = React.useState<TreatmentPlan[]>(
    selectedPatient.active_treatment_plans || []
  );

  const [localNote, setLocalNote] = React.useState('');
  const [creatorError, setCreatorError] = React.useState<string>('');
  const [creatorSuccess, setCreatorSuccess] = React.useState<string>('');

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

  const currentPredefined = SYSTEM_DENTAL_PROCEDURES.find(p => p.id === selectedPredefinedId);
  const activeRate = selectedPredefinedId === 'custom' ? customTreatmentRate : (currentPredefined?.rate || 0);
  
  const countSelected = selectedTeeth.length;
  const grossAmount = activeRate * countSelected;
  const discountedAmount = grossAmount - (grossAmount * (discountPercent / 100));
  const finalPriceWithGst = discountedAmount + (discountedAmount * (gstPercent / 100));

  const submitLocalNote = async () => {
    if (!localNote.trim()) return;
    await onAppendNote(localNote);
    setLocalNote('');
  };

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

  const handleRemoveDraftItem = (index: number) => {
    setDraftBillingItems(prev => prev.filter((_, i) => i !== index));
  };

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
        setVisitStep('Access Opening');
        setVisitTeethLog([]);
        setVisitRemarks('');
        onUpdateStage(data.patient, selectedPatient.current_stage);
      }
    } catch (err) {
      console.error('Failed visit log: ', err);
    }
  };

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

  // Treatment reset/print closure logic
  const handleFinalizePrintAndReset = async () => {
    const timelineNote = `Logged by billing system | Completed native browser printing workflow. Treatment plan closed officially and session variables flushed safely out of memory tree.`;
    const updatedPatient: Patient = {
      ...selectedPatient,
      current_stage: 'STAGE_6_CLOSED',
      history: [...(selectedPatient.history || []), timelineNote]
    };

    try {
      const res = await fetch('/api/patients/update-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient)
      });
      if (res.ok) {
        setCurrentShowPrintPreview(false);
        onBackToDirectory();
      }
    } catch (err) {
      console.error('Error during clinical closure: ', err);
    }
  };

  const draftGrandTotal = draftBillingItems.reduce((acc, item) => acc + item.final_total, 0);

  // Collect all treatment details for summary print
  const allBillingItems = activeTreatmentPlans.flatMap(p => p.billing_items);
  const totalClinicateCost = selectedPatient.financials?.total_cost || allBillingItems.reduce((acc, b) => acc + b.final_total, 0);
  const paymentModeSelected = selectedPatient.selected_payment_mode || selectedPatient.financials?.payment_mode || 'Not Selected';
  const totalVisitsCount = activeTreatmentPlans.reduce((sum, p) => sum + p.visit_logs.length, 0);

  // Extract earliest date from logs
  const getTreatmentStartDate = () => {
    let dateStr = '02-06-2026'; // Default template starting date
    if (activeTreatmentPlans.length > 0) {
      const allDates = activeTreatmentPlans
        .flatMap(p => p.visit_logs)
        .map(v => v.date)
        .filter(Boolean);
      if (allDates.length > 0) {
        allDates.sort();
        return allDates[0];
      }
    }
    return dateStr;
  };

  const getPersonaColor = (persona: string) => {
    const pLower = persona.toLowerCase();
    if (pLower.includes('receptionist')) return 'bg-sky-50 border-sky-100 text-sky-700';
    if (pLower.includes('junior')) return 'bg-amber-50 border-amber-150 text-amber-800';
    if (pLower.includes('senior') || pLower.includes('doctor') || pLower.includes('dentist')) return 'bg-emerald-50 border-emerald-150 text-emerald-800';
    return 'bg-slate-50 border-slate-150 text-slate-700';
  };

  const architecturalStatePayload = {
    dossier_header: {
      patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
      gender: selectedPatient.gender,
      age: patientAge,
      mobile: selectedPatient.mobile || "",
      active_case_stage: selectedPatient.current_stage
    },
    navigation_wizard: {
      current_active_tab: currentTab,
      show_print_preview: currentShowPrintPreview
    },
    chat_log_sidebar: {
      history_length: selectedPatient.history?.length || 0,
      history_logs: selectedPatient.history || []
    },
    tab_billing_plan_data: {
      draft_billing_items_count: draftBillingItems.length,
      draft_billing_items: draftBillingItems,
      selected_payment_mode: selectedPaymentMode,
      discount_percent: discountPercent,
      gst_percent: gstPercent
    },
    tab_execution_progress_data: {
      active_treatment_plans_count: activeTreatmentPlans.length,
      active_treatment_plans: activeTreatmentPlans
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn pb-12 font-sans text-slate-800">
      
      {/* 🟦 1. Global Header Row */}
      <DossierHeader
        selectedPatient={selectedPatient}
        patientAge={patientAge}
        onUpdateStage={onUpdateStage}
        onBackToDirectory={onBackToDirectory}
      />

      {/* RENDER PRINT PREVIEW SCREEN */}
      {currentShowPrintPreview ? (
        <div id="print-preview-container" className="bg-slate-100 p-4 md:p-8 rounded-3xl border border-slate-350 shadow-md flex flex-col gap-6 max-w-4xl mx-auto w-full">
          
          {/* Header block with close and action controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Workflow Stage 3: Clinical Session End</h4>
              <span className="text-xs text-slate-600 block">Review dental report card before printing. Entries are locked and frozen.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-return-from-print-preview"
                onClick={() => setCurrentShowPrintPreview(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border-0 cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> Edit Logs
              </button>
              <button
                id="btn-trigger-print"
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-750 text-white font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 border-y border-indigo-700 shadow-sm"
              >
                <Printer className="h-4 w-4" /> Print PDF / Case Report
              </button>
            </div>
          </div>

          {/* Printable Report Canvas Sheet closely mimicking clinical aesthetics */}
          <div id="clinical-print-sheet" className="bg-white border-2 border-slate-900 p-8 md:p-12 shadow-sm rounded-3xl flex flex-col gap-8 font-serif leading-relaxed text-slate-900 printable-card">
            
            {/* Header: Hospital Logo Block */}
            <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
              <h1 className="text-xl md:text-2xl font-black font-sans uppercase tracking-tight text-slate-900">
                🦷 TATVA PRACTICE DENTAL CLINIC CASE REPORT
              </h1>
              <p className="text-xs text-slate-500 font-sans tracking-wide">
                Specialized Prosthodontics, Dental Implants, and Endodontics Centre
              </p>
              <p className="text-[10px] text-slate-450 font-mono">
                12, Clinical Plaza, Sector 4, New Delhi - 110001 | Contact: +91 99999 88888
              </p>
            </div>

            {/* Section 2: Clinical Demographics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs font-sans">
              <div className="space-y-1.5">
                <div><span className="font-extrabold text-slate-650 uppercase">Patient Name:</span> <strong className="text-slate-900 font-black text-sm">{selectedPatient.salutation || 'Mr.'} {selectedPatient.first_name} {selectedPatient.last_name}</strong></div>
                <div><span className="font-extrabold text-slate-650 uppercase">Gender / Age:</span> <span className="font-semibold text-slate-800">{selectedPatient.gender} / {patientAge} Years</span></div>
                <div><span className="font-extrabold text-slate-650 uppercase">Patient Mobile:</span> <span className="font-mono text-slate-800 font-bold">{selectedPatient.mobile || 'N/A'}</span></div>
              </div>
              <div className="space-y-1.5">
                <div><span className="font-extrabold text-slate-650 uppercase">Patient ID:</span> <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-800 font-black">{selectedPatient.patient_id}</span></div>
                <div><span className="font-extrabold text-slate-650 uppercase">Current Stage:</span> <span className="text-indigo-800 font-bold">{selectedPatient.current_stage.replace('STAGE_', 'STAGE ').replace('_', ' ')}</span></div>
                <div><span className="font-extrabold text-slate-650 uppercase">Case Status:</span> <span className="text-emerald-700 font-extrabold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Finished & Closed</span></div>
              </div>
            </div>

            {/* Section 3: Timeline Summary Metrics */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-slate-850 tracking-wider font-sans border-b border-slate-300 pb-1">📅 Clinical Timeline Record</h3>
              <div className="grid grid-cols-3 gap-4.5 text-center text-xs font-mono font-bold">
                <div className="bg-slate-50 border border-slate-250 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-400 block uppercase">Treatment Start</span>
                  <span className="text-slate-850 text-xs mt-1 block">{getTreatmentStartDate()}</span>
                </div>
                <div className="bg-slate-50 border border-slate-250 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-400 block uppercase">Treatment Completed</span>
                  <span className="text-slate-850 text-xs mt-1 block">10-06-2026</span>
                </div>
                <div className="bg-slate-50 border border-slate-250 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-400 block uppercase">Clinical Visits Record</span>
                  <span className="text-indigo-650 text-xs mt-1 block">{totalVisitsCount} Visit{totalVisitsCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Section 4: Completed Procedures Ledger */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-black uppercase text-slate-850 tracking-wider font-sans border-b border-slate-300 pb-1">🩺 Completed Dental Treatments Ledger</h3>
              
              {activeTreatmentPlans.length === 0 ? (
                <p className="text-xs text-slate-450 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">No active treatment plans registered on case records.</p>
              ) : (
                <div className="overflow-hidden border border-slate-300 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-705 uppercase text-[9.5px] leading-none">
                        <th className="p-3">Tooth ID (FDI)</th>
                        <th className="p-3">Procedure Name</th>
                        <th className="p-3">Primary Operator</th>
                        <th className="p-3">Assistant Nurse</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {activeTreatmentPlans.flatMap(p => 
                        p.billing_items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/20">
                            <td className="p-3 font-mono font-bold text-indigo-700 bg-indigo-50/20 text-center w-24">
                              {item.tooth_no.join(', ')}
                            </td>
                            <td className="p-3 font-bold text-slate-850">
                              {item.procedure_name}
                            </td>
                            <td className="p-3 text-slate-700">
                              {p.visit_logs[0]?.conducted_by || 'Dr. Sarah Jenkins'}
                            </td>
                            <td className="p-3 text-slate-600">
                              {p.visit_logs[0]?.assisted_by || 'Nurse Sarah'}
                            </td>
                            <td className="p-3 text-right font-black text-emerald-700 font-mono">
                              DONE ✅
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 5: Financial Statement Ledger */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-black uppercase text-slate-850 tracking-wider font-sans border-b border-slate-300 pb-1">💳 Finalized Patient Financial Statement</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-sans">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9.5px] font-black text-slate-450 uppercase block">Calculated Total</span>
                  <span className="text-slate-900 font-black text-sm font-mono mt-1 block">₹{totalClinicateCost.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9.5px] font-black text-slate-450 uppercase block">Selected Payment Mode</span>
                  <span className="text-slate-900 font-black text-xs font-mono mt-1 block">{paymentModeSelected}</span>
                </div>
                <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[9.5px] font-black text-emerald-800 uppercase block">Amount Realized / Collected</span>
                  <span className="text-emerald-900 font-black text-sm font-mono mt-1 block">₹{totalClinicateCost.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9.5px] font-black text-slate-450 uppercase block">Deferred Balance / Overdue</span>
                  <span className="text-slate-450 font-black text-sm font-mono mt-1 block">₹0</span>
                </div>
              </div>
            </div>

            {/* Certifying Signature block */}
            <div className="mt-8 pt-8 border-t border-slate-250 flex justify-between items-end font-sans text-xs">
              <div className="space-y-1">
                <span className="text-slate-450 block">Prepared By:</span>
                <span className="font-bold text-slate-800"> Tatva Billing Desks Ops</span>
                <span className="text-[10px] text-slate-400 font-mono block">System Timestamp: 10-06-2026 UTC</span>
              </div>
              <div className="space-y-1 text-right">
                <div className="h-10 w-24 border-b border-slate-400 mx-auto" />
                <span className="font-bold text-slate-800 block">Attending Dentist Signatory</span>
                <span className="text-[10px] text-slate-400 block font-serif italic">MDS Periodontics & Oral Surgery</span>
              </div>
            </div>

          </div>

          {/* Prompt warning & return layout button triggers */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="leading-normal">
              <p className="text-xs font-black text-amber-900 tracking-wide flex items-center gap-1.5 font-mono uppercase">
                <ShieldAlert className="h-4 w-4 text-amber-600 animate-bounce" /> Clinical Action Required: Pipeline Release
              </p>
              <p className="text-[11.5px] text-amber-850 mt-0.5">Clicking "Auto Reset" will seal this patient ledger, set status to Treatment Closed, and return to directory.</p>
            </div>
            <button
              id="btn-finalize-treatment"
              onClick={handleFinalizePrintAndReset}
              className="bg-red-600 hover:bg-red-750 text-white font-black text-xs px-5 py-3 rounded-xl cursor-pointer shadow-md tracking-wider border-0 shrink-0 transition-colors"
            >
              🔴 Reset Live Queue & Finish Treatment
            </button>
          </div>

        </div>
      ) : (
        /* DUAL-PANEL LAYOUT SPLIT-SCREEN VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
          
          {/* LEFT 60% WORKSPACE TABBED INTERFACE */}
          <div id="dossier-left-workspace" className="lg:col-span-7 flex flex-col gap-5">
            
            {/* Horizontal Sub-tabs controller */}
            <div id="dossier-left-tab-selectors" className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 flex gap-2 shadow-sm">
              <button
                id="tab-btn-treatment-plan"
                onClick={() => setCurrentTab('PLAN')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer border-0 flex items-center justify-center gap-2 outline-none ${
                  currentTab === 'PLAN'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-slate-650 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                📋 [TAB: Treatment Plan]
              </button>
              <button
                id="tab-btn-treatment-progress"
                onClick={() => setCurrentTab('PROGRESS')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer border-0 flex items-center justify-center gap-2 outline-none ${
                  currentTab === 'PROGRESS'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-slate-650 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                ⚙️ [TAB: Treatment In Progress]
              </button>
            </div>

            {/* TAB CONTENTS (PLAN OR PROGRESS) */}
            {currentTab === 'PLAN' ? (
              <TabBillings
                selectedPatient={selectedPatient}
                patientAge={patientAge}
                isChild={isChild}
                SYSTEM_DENTAL_PROCEDURES={SYSTEM_DENTAL_PROCEDURES}
                selectedPredefinedId={selectedPredefinedId}
                setSelectedPredefinedId={setSelectedPredefinedId}
                discountPercent={discountPercent}
                setDiscountPercent={setDiscountPercent}
                gstPercent={gstPercent}
                setGstPercent={setGstPercent}
                selectedTeeth={selectedTeeth}
                onToggleTooth={onToggleTooth}
                onSelectAllTeeth={onSelectAllTeeth}
                onClearTeeth={onClearTeeth}
                countSelected={countSelected}
                activeRate={activeRate}
                grossAmount={grossAmount}
                finalPriceWithGst={finalPriceWithGst}
                handleAddProcedureToDraft={handleAddProcedureToDraft}
                creatorError={creatorError}
                creatorSuccess={creatorSuccess}
                draftBillingItems={draftBillingItems}
                handleRemoveDraftItem={handleRemoveDraftItem}
                selectedPaymentMode={selectedPaymentMode}
                setSelectedPaymentMode={setSelectedPaymentMode}
                draftGrandTotal={draftGrandTotal}
                handleLockAndActivatePlan={handleLockAndActivatePlan}
                aiInputText={aiInputText}
                setAiInputText={setAiInputText}
                handleAISubmit={handleAISubmit}
                aiLoading={aiLoading}
                setShowCustomPopup={setShowCustomPopup}
                onPrevStep={onBackToDirectory}
                onNextStep={() => setCurrentTab('PROGRESS')}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {/* Highlight/Finish treatment quick header line */}
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-black tracking-widest text-rose-700 block font-mono">Sessions Complete?</span>
                    <p className="text-xs text-rose-850">Click "Finish Treatment" to lock procedures ledger and download case reports.</p>
                  </div>
                  <button
                    id="dossier-btn-finish-treatment-tab"
                    onClick={() => setCurrentShowPrintPreview(true)}
                    className="bg-red-650 hover:bg-red-750 text-white font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer border-0 flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
                  >
                    🔴 Finish Treatment
                  </button>
                </div>

                <TabExecution
                  activeTreatmentPlans={activeTreatmentPlans}
                  handleMarkPlanStatusDone={handleMarkPlanStatusDone}
                  visitStep={visitStep}
                  setVisitStep={setVisitStep}
                  visitConductedBy={visitConductedBy}
                  setVisitConductedBy={setVisitConductedBy}
                  visitAssistedBy={visitAssistedBy}
                  setVisitAssistedBy={setVisitAssistedBy}
                  visitRemarks={visitRemarks}
                  setVisitRemarks={setVisitRemarks}
                  handleAppendVisitLog={handleAppendVisitLog}
                  onPrevStep={() => setCurrentTab('PLAN')}
                />
              </div>
            )}

          </div>

          {/* RIGHT 40% PERMANENT FIXED CHAT history timeline SIDEBAR */}
          <div id="dossier-right-centralized-chat-sidebar" className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-5 self-start">
            
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs md:text-sm font-black text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-600 animate-pulse" />
                Centralized Chat Log Timeline
              </h3>
              <p className="text-[11px] text-slate-450 mt-1">
                Scrollable history showing exactly what receptionist, dentist, or doctor entered in the dossier.
              </p>
            </div>

            {/* Scrollable chronological notes stack */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
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
                      className="p-3.5 bg-slate-50 text-slate-800 rounded-2xl border border-slate-150 flex flex-col gap-2 hover:bg-slate-100/50 transition-all"
                    >
                      <div className="flex items-center justify-between leading-none pb-1 border-b border-slate-200/40">
                        <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border ${getPersonaColor(persona)}`}>
                          {persona.replace('Logged by', '').trim()}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">Dossier Step #{index + 1}</span>
                      </div>
                      <p className="text-xs font-serif text-slate-700 leading-relaxed italic">{noteDetails}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-450 italic text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No historical timeline logs recorded yet.
                </p>
              )}
            </div>

            {/* Message composer input matching Centralised Chat Log requirements */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-2">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block font-mono">Log Doctor Comment</span>
              <div className="flex gap-1.5">
                <input 
                  id="chat-manual-timeline-comment-field"
                  type="text"
                  placeholder="Record diagnosis, updates, or receptionist remarks..."
                  value={localNote}
                  onChange={(e) => setLocalNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitLocalNote();
                  }}
                  className="flex-1 bg-white border border-slate-250 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
                <button 
                  onClick={submitLocalNote}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-center border-0 shrink-0 shadow-sm"
                >
                  Log
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Custom Treatment Pop-up Modal */}
      {showCustomPopup && (
        <div id="dialog-clinical-custom-treatment-popup" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden p-6 relative flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-850 uppercase tracking-wide flex items-center gap-1.5 font-mono">
                🚀 Add Doctor (Custom Procedure Formulator)
              </h3>
              <p className="text-[11px] text-slate-455 mt-1 leading-relaxed">
                Add unlisted advanced clinical procedure lines with dedicated price controls.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase">Procedure Name</label>
                <input
                  id="custom-procedure-name"
                  type="text"
                  placeholder="e.g. Implant Abutment Restorations"
                  value={customPopupName}
                  onChange={(e) => setCustomPopupName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-450 uppercase">Custom Base Rate</label>
                  <input
                    id="custom-procedure-rate"
                    type="number"
                    value={customPopupRate}
                    onChange={(e) => setCustomPopupRate(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-505 font-medium text-slate-850 mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-450 uppercase">Discounts (%)</label>
                  <input
                    id="custom-procedure-discount"
                    type="number"
                    value={customPopupDiscount}
                    onChange={(e) => setCustomPopupDiscount(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-505 font-medium text-slate-800 mt-1 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => setShowCustomPopup(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border-0 shadow-sm outline-none"
              >
                Cancel ❌
              </button>
              <button
                id="btn-inject-custom-procedure"
                onClick={() => {
                  if (!customPopupName.trim()) {
                    setCreatorError('Please specify a procedure name.');
                    return;
                  }
                  setCustomTreatmentName(customPopupName);
                  setCustomTreatmentRate(customPopupRate);
                  setDiscountPercent(customPopupDiscount);
                  setGstPercent(customPopupGst);
                  setSelectedPredefinedId('custom');
                  setShowCustomPopup(false);
                  setCreatorSuccess(`Custom Procedure "${customPopupName}" configured! Now click "Add Item Line" to insert.`);
                  setCreatorError('');
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 rounded-xl text-xs transition-colors cursor-pointer border-0 shadow-sm outline-none"
              >
                Inject Procedure to Plan ➕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💾 ARCHITECTURAL STATE PAYLOAD (JSON Navigation Tracking) */}
      <div id="architectural-state-payload-inspector" className="mt-8 border-t border-slate-200 pt-6">
        <details className="group cursor-pointer select-none">
          <summary className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              💾 ARCHITECTURAL STATE PAYLOAD (JSON Navigation Tracking)
            </span>
            <span className="text-[9px] bg-slate-100 text-slate-500 py-1 px-2 rounded-lg group-open:hidden">Show JSON Registry</span>
            <span className="text-[9px] bg-slate-900 text-white py-1 px-2 rounded-lg hidden group-open:inline">Hide JSON Registry</span>
          </summary>
          <div className="mt-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl p-4 overflow-x-auto shadow-inner text-[11px] font-mono">
            <pre id="architectural-state-payload">{JSON.stringify(architecturalStatePayload, null, 2)}</pre>
          </div>
        </details>
      </div>

    </div>
  );
}
