import React, { useState } from 'react';
import { 
  IndianRupee, 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  Search, 
  Send,
  Check, 
  User, 
  ShieldAlert,
  ArrowRight,
  Sparkles,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import { Patient } from '../types';

interface OPDBillingDashboardProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onNavigateToView: (view: 'PAGE_1' | 'PAGE_2' | 'PAGE_3') => void;
  onRefreshData: () => void;
}

export default function OPDBillingDashboard({
  patients,
  onSelectPatient,
  onNavigateToView,
  onRefreshData
}: OPDBillingDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Financial Math Engine ---
  
  // 1. Total Est. Case Value: gross amount of ALL treatment plans
  const totalEstCaseValue = patients.reduce((acc, p) => acc + (p.financials?.total_cost || 0), 0);

  // 2. Realized Income (Collected):
  // Fully Paid patients => 100% total cost is realized
  // Active EMI patients => Let's assume they have paid Month 1 EMI + maybe some default down payments.
  // For standard seeds, Ashish has paid 2667 (Month 1 EMI). Let's calculate exactly based on financial state.
  const realizedIncome = patients.reduce((acc, p) => {
    const cost = p.financials?.total_cost || 0;
    const isEmi = p.financials?.payment_status === 'Active EMI';
    const isPaid = p.current_stage === 'STAGE_5: PAYMENT_COMPLETED' || p.financials?.payment_status === 'Fully Paid';
    
    if (isPaid) {
      return acc + cost;
    } else if (isEmi) {
      // upfront down payment (simulated 25% of total cost) + 1st month installment
      const downPayment = Math.round(cost * 0.25);
      const emiVal = p.financials?.emi_monthly_amount || 0;
      return acc + downPayment + emiVal;
    }
    return acc;
  }, 0);

  // 3. EMI Book Value (Deferred): Remaining balances contractually locked but not yet collected (Active EMI total cost - realized amount)
  const emiBookValue = patients.reduce((acc, p) => {
    const cost = p.financials?.total_cost || 0;
    const isEmi = p.financials?.payment_status === 'Active EMI';
    const isPaid = p.current_stage === 'STAGE_5: PAYMENT_COMPLETED' || p.financials?.payment_status === 'Fully Paid';
    
    if (isEmi && !isPaid) {
      const downPayment = Math.round(cost * 0.25);
      const emiVal = p.financials?.emi_monthly_amount || 0;
      const collected = downPayment + emiVal;
      return acc + (cost - collected);
    }
    return acc;
  }, 0);

  // 4. Active Monthly Installments: Total expected EMI values clearing in the current monthly cycle
  const activeMonthlyInstallments = patients.reduce((acc, p) => {
    const isEmi = p.financials?.payment_status === 'Active EMI';
    const isPaid = p.current_stage === 'STAGE_5: PAYMENT_COMPLETED' || p.financials?.payment_status === 'Fully Paid';
    if (isEmi && !isPaid) {
      return acc + (p.financials?.emi_monthly_amount || 0);
    }
    return acc;
  }, 0);

  // --- Overdue Calculations & Flag Engine ---
  // Identify overdue/stalled accounts:
  // e.g. Patients with uncompleted treatment plans, or who are in STAGE_3/STAGE_4 with clinical costs but Payment status is unselected/unpaid,
  // or active EMIs that have stalled.
  // Let's flag any patient having STAGE_3 Treatment Plan Shared or STAGE_4 but hasn't fully paid.
  const overdueAccounts = patients.filter(p => {
    const cost = p.financials?.total_cost || 0;
    const activePipeline = p.current_stage === 'STAGE_3: TREATMENT_PLAN_SHARED' || p.current_stage === 'STAGE_4: TREATMENT_ACCEPTED';
    const unpaid = !p.financials?.payment_status || p.financials?.payment_status === 'Unpaid';
    return activePipeline && cost > 0 && unpaid;
  });

  const totalOverdueAmount = overdueAccounts.reduce((acc, p) => acc + (p.financials?.total_cost || 0), 0);

  // --- Filtering Ledger ---
  const filteredLedger = patients.filter(p => {
    const rawName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const query = searchTerm.toLowerCase().trim();
    return rawName.includes(query) || (p.patient_id || '').toLowerCase().includes(query);
  });

  // --- Interactive Actions ---
  const handleCollectEMI = async (patient: Patient) => {
    // Simulates collecting an EMI installment by adding an activity note & notifying backend
    try {
      const emiVal = patient.financials?.emi_monthly_amount || 2667;
      const res = await fetch('/api/patients/manual-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patient.patient_id,
          notes: `Logged by Accountant | Collection of monthly installment of ₹${emiVal} processed successfully. Clear digital receipt issued.`
        })
      });
      if (res.ok) {
        setSuccessMessage(`Digital EMI receipt of ₹${emiVal} issued successfully for ${patient.first_name} ${patient.last_name}!`);
        onRefreshData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReminder = (patient: Patient) => {
    const mobileNo = patient.mobile || '7777939935';
    alert(`[SMS GATEWAY SIMULATOR]\nSent payment collection link & EMI reminder to cell number +91 ${mobileNo} for Patient ${patient.first_name} ${patient.last_name}.`);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn font-sans">
      
      {/* Tab Navigation header breadcrumb */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight font-display flex items-center gap-2">
            📊 <span className="bg-gradient-to-r from-slate-900 to-indigo-805 bg-clip-text text-transparent">OPD Live Billing Ledger & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">Core financial tracking of treatment case values, immediate realized cashflows, and EMI book collections.</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="bg-slate-100 font-extrabold text-slate-500 px-2.5 py-1 rounded-lg border border-slate-250">
            BILLING CYLCE: ACTIVE (MAY/JUNE)
          </span>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl text-xs font-bold leading-relaxed flex items-center gap-2.5 animate-bounce">
          <Check className="h-4 w-4 bg-emerald-600 text-white rounded-full p-0.5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* --- SECTION 1: THE 4 MACRO PERFORMER METRICS CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Gross Est Case Value */}
        <div id="card-total-gross-value" className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-3xl shadow-xs transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/20 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Gross Case Value</span>
            <span className="p-2 bg-indigo-50 text-indigo-650 rounded-xl">
              <IndianRupee className="h-4 w-4" />
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">
            ₹{totalEstCaseValue.toLocaleString('en-IN')}
          </h2>
          <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-emerald-600 font-bold">
            <TrendingUp className="h-3 w-3" />
            <span>Cumulative treatment plans gross value</span>
          </div>
        </div>

        {/* Card 2: Realized Income */}
        <div id="card-realized-income" className="bg-slate-950 border border-slate-900 p-5 rounded-3xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono text-emerald-450">Realized Liquid Income</span>
            <span className="p-2 bg-emerald-950/45 text-emerald-400 rounded-xl border border-emerald-900/30">
              <Check className="h-4 w-4" />
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            ₹{realizedIncome.toLocaleString('en-IN')}
          </h2>
          <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-emerald-400 font-bold">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <span>Downpayments + cleared EMIs collected</span>
          </div>
        </div>

        {/* Card 3: Deferred EMI Book Value */}
        <div id="card-deferred-emi" className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-3xl shadow-xs transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50/20 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">EMI Book Value (Deferred)</span>
            <span className="p-2 bg-sky-50 text-sky-650 rounded-xl">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">
            ₹{emiBookValue.toLocaleString('en-IN')}
          </h2>
          <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-sky-600 font-bold">
            <span>Contractually locked long-term receivables</span>
          </div>
        </div>

        {/* Card 4: Active Monthly Installments */}
        <div id="card-active-monthly" className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-3xl shadow-xs transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/20 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Cycle Installments (Monthly)</span>
            <span className="p-2 bg-amber-50 text-amber-650 rounded-xl">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">
            ₹{activeMonthlyInstallments.toLocaleString('en-IN')}
          </h2>
          <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-amber-600 font-bold">
            <span>Core monthly expected recurring revenue</span>
          </div>
        </div>

      </div>

      {/* --- SECTION 2: THE "PENDING TREATMENT OVERDUE" ALERT BAR --- */}
      {overdueAccounts.length > 0 && (
        <div id="overdue-alarm-banner" className="bg-red-50 border border-red-200 p-4.5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="p-2.5 bg-red-100 text-red-700 rounded-xl shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-red-950 font-black text-sm uppercase tracking-wide font-mono">Pending Treatment & Payment Overdue Warning!</h4>
              <p className="text-xs text-red-700 leading-relaxed font-semibold mt-0.5">
                We detected {overdueAccounts.length} stalled treatment plan(s) lacking locked payment structures. Total overdue value currently in limbo is <strong className="font-extrabold text-red-900 underline">₹{totalOverdueAmount.toLocaleString('en-IN')}</strong>. Secure payment modes or send instant reminder links below.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 select-none">
            <span className="bg-red-600 text-white font-mono text-[9px] font-black px-3 py-1.5 rounded-lg border border-red-700 animate-pulse uppercase tracking-wider">
              CRITICAL UNPAID
            </span>
          </div>
        </div>
      )}

      {/* --- SECTION 3: THE MAIN LEDGER ACCOUNT --- */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        
        {/* Ledger Header & Search filter */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">OPD Transaction Ledger</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">List of all active clinic accounts, bills, and realized vs. outstanding deferred items.</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search ledger by name / ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-700 font-semibold"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider border-b border-slate-800 font-mono">
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4">Bill No & Date</th>
                <th className="py-3 px-4">Patient Details</th>
                <th className="py-3 px-4 text-right">Total Est Cost</th>
                <th className="py-3 px-4 text-right">Realized (Collected)</th>
                <th className="py-3 px-4 text-right">Deferred EMI</th>
                <th className="py-3 px-4 text-right text-red-400">Overdue / Outstanding</th>
                <th className="py-3 px-4 text-center w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
              {filteredLedger.map((patient, index) => {
                const cost = patient.financials?.total_cost || 0;
                const isPaid = patient.current_stage === 'STAGE_5: PAYMENT_COMPLETED' || patient.financials?.payment_status === 'Fully Paid';
                const isEmi = patient.financials?.payment_status === 'Active EMI';
                const isUnpaid = !patient.financials?.payment_status || patient.financials?.payment_status === 'Unpaid';
                
                // Generated Bill ID corresponding to patient indices
                const billId = `BILL_0${12 + index}`;
                const billDate = patient.last_visit || '12-04-2026';

                // Realized Calculations
                let patientRealized = 0;
                if (isPaid) {
                  patientRealized = cost;
                } else if (isEmi) {
                  const downPayment = Math.round(cost * 0.25);
                  const emiVal = patient.financials?.emi_monthly_amount || 0;
                  patientRealized = downPayment + emiVal;
                }

                // Deferred Calculations
                const patientDeferred = isEmi && !isPaid ? (cost - patientRealized) : 0;

                // Overdue Calculations
                const patientOverdue = isUnpaid && cost > 0 ? cost : 0;

                const category = patient.category || patient.appointment_booking?.patient_category || 'General';

                return (
                  <tr key={patient.patient_id} className={`hover:bg-slate-50/50 transition-colors ${patientOverdue > 0 ? 'bg-red-50/20' : ''}`}>
                    
                    {/* Index */}
                    <td className="py-4 px-4 text-center font-mono text-slate-400 font-medium">
                      {index + 1}
                    </td>

                    {/* Bill details */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col font-mono text-[11px]">
                        <span className="font-extrabold text-slate-800">{billId}</span>
                        <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-0.5 mt-0.5">
                          <Calendar className="h-3 w-3 inline text-slate-350" /> {billDate}
                        </span>
                      </div>
                    </td>

                    {/* Patient detail */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span 
                          onClick={() => onSelectPatient(patient)}
                          className="font-black text-indigo-700 hover:underline cursor-pointer flex items-center gap-1 leading-none text-[12.5px]"
                        >
                          {patient.salutation || 'Mr.'} {patient.first_name} {patient.last_name}
                          <ExternalLink className="h-3 w-3 inline opacity-50 text-slate-400" />
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[9.5px] text-slate-400 uppercase tracking-wide font-extrabold leading-none">
                          <span>{patient.patient_id}</span>
                          <span>&middot;</span>
                          <span className={`px-1 py-0.5 rounded text-[8px] border font-mono ${
                            category === 'VIP' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>{category}</span>
                        </div>
                      </div>
                    </td>

                    {/* Gross Cost */}
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                      ₹{cost.toLocaleString('en-IN')}
                    </td>

                    {/* Realized */}
                    <td className="py-4 px-4 text-right font-mono font-extrabold text-emerald-750">
                      ₹{patientRealized.toLocaleString('en-IN')}
                    </td>

                    {/* Deferred */}
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-550">
                      {patientDeferred > 0 ? `₹${patientDeferred.toLocaleString('en-IN')}` : '—'}
                    </td>

                    {/* Overdue */}
                    <td className="py-4 px-4 text-right font-mono font-black text-red-600">
                      {patientOverdue > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-650 bg-red-50 px-2 py-0.5 rounded">
                          <AlertTriangle className="h-3 w-3" /> ₹{patientOverdue.toLocaleString('en-IN')}
                        </span>
                      ) : '—'}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isEmi && !isPaid ? (
                          <button
                            onClick={() => handleCollectEMI(patient)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg border-0 transition-colors cursor-pointer outline-none"
                            title="Collect Monthly Installment"
                          >
                            Collect EMI
                          </button>
                        ) : patientOverdue > 0 ? (
                          <button
                            onClick={() => handleSendReminder(patient)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer outline-none flex items-center gap-1"
                            title="Send payment alert"
                          >
                            <Send className="h-3 w-3" /> Alert
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-150 px-2 py-1 rounded-lg">
                            ✓ fully paid
                          </span>
                        )}

                        <button
                          onClick={() => {
                            onSelectPatient(patient);
                            onNavigateToView('PAGE_2');
                          }}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 p-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          title="View clinical dossier"
                        >
                          <User className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
