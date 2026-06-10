import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Activity, 
  DollarSign, 
  CheckCircle, 
  TrendingUp, 
  Bell, 
  Send, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  User, 
  ChevronRight, 
  FileText, 
  X, 
  ArrowRight,
  Info,
  Plus,
  Trash2
} from 'lucide-react';
import { Patient, PatientStage, DoctorNotification } from './types';
import ReactMarkdown from 'react-markdown';
import LoginOnboarding from './components/LoginOnboarding';
import MDCommandTerminal from './components/MDCommandTerminal';
import MasterDirectory from './components/MasterDirectory';
import PatientDeepDive from './components/PatientDeepDive';

const SYSTEM_DENTAL_PROCEDURES = [
  { id: 'scaling', name: 'Scaling & Polishing', rate: 1000, is_custom: false },
  { id: 'filling', name: 'Composite Filling', rate: 1500, is_custom: false },
  { id: 'extraction', name: 'Extraction', rate: 2000, is_custom: false },
  { id: 'laser', name: 'Deep Laser Sterilization', rate: 3000, is_custom: true },
  { id: 'rct', name: 'Root Canal Treatment (RCT)', rate: 4000, is_custom: false },
  { id: 'crown', name: 'Crown/Cap', rate: 5000, is_custom: false },
];

const SPECIALTIES = [
  "General Dentistry",
  "Endodontics",
  "Orthodontics",
  "Prosthodontics",
  "Periodontics",
  "Oral Surgery"
];

const FDI_ADULT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const FDI_ADULT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const FDI_ADULT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
const FDI_ADULT_LOWER_RIGHT = [41, 42, 43, 44, 45, 46, 47, 48];

const FDI_CHILD_UPPER_LEFT = [51, 52, 53, 54, 55];
const FDI_CHILD_UPPER_RIGHT = [61, 62, 63, 64, 65];
const FDI_CHILD_LOWER_LEFT = [71, 72, 73, 74, 75];
const FDI_CHILD_LOWER_RIGHT = [81, 82, 83, 84, 85];

const getPatientAgeValue = (ageStr?: string): number => {
  if (!ageStr) return 30; // default to adult if not set
  const match = ageStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 30;
};

export default function App() {
  // Authenticated practitioner context
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    mobile_no: string;
    first_name: string;
    last_name: string;
    gender: string;
    age_dob: string;
    type: 'doctor' | 'staff';
  } | null>(() => {
    const saved = localStorage.getItem('denta_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // UI Roles: 'staff' (Receptionist / Junior Doctor) or 'doctor' (Senior Dental Doctor Admin)
  const [activeRole, setActiveRole] = useState<'staff' | 'doctor'>('staff');
  
  // State from server API
  const [patients, setPatients] = useState<Patient[]>([]);
  const [notifications, setNotifications] = useState<DoctorNotification[]>([]);
  
  // Selected Patient for view or AI update
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Loading and Interaction states
  const [loading, setLoading] = useState<boolean>(true);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  
  // Natural language update input
  const [aiInputText, setAiInputText] = useState<string>('');

  // Custom navigation views for senior doctor
  const [activeView, setActiveView] = useState<'PAGE_1' | 'PAGE_2'>('PAGE_1');
  const [commandInput, setCommandInput] = useState('');
  const [commandSuccess, setCommandSuccess] = useState('');
  const [commandError, setCommandError] = useState('');

  const handleExecuteCommand = async (cmdText: string) => {
    const text = cmdText.trim();
    if (!text) return;

    setCommandSuccess('');
    setCommandError('');

    try {
      // 1. Back to Directory
      if (/^back\s+to\s+directory$/i.test(text)) {
        setSelectedPatient(null);
        setActiveView('PAGE_1');
        setCommandSuccess('Navigated back to Master Patient Directory.');
        setCommandInput('');
        return;
      }

      // 2. Click [Patient Name]
      const clickMatch = text.match(/^click\s+(.+)$/i);
      if (clickMatch) {
        const targetName = clickMatch[1].trim().toLowerCase();
        const matched = patients.find(p => 
          `${p.first_name} ${p.last_name}`.toLowerCase() === targetName ||
          p.first_name.toLowerCase() === targetName ||
          p.last_name.toLowerCase() === targetName
        );
        if (matched) {
          setSelectedPatient(matched);
          setActiveView('PAGE_2');
          setCommandSuccess(`Successfully deep dived into patient: ${matched.first_name} ${matched.last_name}`);
          setCommandInput('');
        } else {
          setCommandError(`Patient "${clickMatch[1]}" not found in database.`);
        }
        return;
      }

      // 3. Add Patient [Details]
      const addMatch = text.match(/^add\s+patient\s+(.+)$/i);
      if (addMatch) {
        const rawDetails = addMatch[1].trim();
        let nameStr = "";
        let genderStr = "Male";
        let ageStr = "30";

        if (rawDetails.includes(',')) {
          const parts = rawDetails.split(',');
          nameStr = parts[0]?.trim() || "";
          genderStr = parts[1]?.trim() || "Male";
          ageStr = parts[2]?.trim() || "30";
        } else {
          nameStr = rawDetails;
        }

        const nameParts = nameStr.split(/\s+/);
        const fName = nameParts[0] || "New";
        const lName = nameParts.slice(1).join(" ") || "Patient";

        // make API post call
        const response = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: fName,
            last_name: lName,
            gender: genderStr,
            age_dob: ageStr.includes('year') ? ageStr : `${ageStr} years old`,
            current_stage: 'STAGE_1: FOLLOW_UP',
            history: [`Logged by Receptionist | Manual onboard: ${fName} ${lName}, ${genderStr}, ${ageStr} years old`],
            financials: {
              total_cost: 0,
              payment_mode: 'Not Selected',
              payment_status: 'Pending',
              emi_months: 0,
              emi_monthly_amount: 0
            }
          })
        });

        if (response.ok) {
          await fetchCRMData();
          setActiveView('PAGE_1');
          setSelectedPatient(null);
          setCommandSuccess(`Successfully added patient ${fName} ${lName} to directory!`);
          setCommandInput('');
        } else {
          setCommandError('Failed to save patient on server.');
        }
        return;
      }

      // 4. Update [Patient Name] with notes: [Notes] and move to [Stage]
      const updateMatch = text.match(/^update\s+(.+?)\s+with\s+notes:\s*(.+?)\s+and\s+move\s+to\s+(.+)$/i);
      if (updateMatch) {
        const targetName = updateMatch[1].trim().toLowerCase();
        const notesPart = updateMatch[2].trim();
        const rawStage = updateMatch[3].trim().toUpperCase();

        const matched = patients.find(p => 
          `${p.first_name} ${p.last_name}`.toLowerCase() === targetName ||
          p.first_name.toLowerCase() === targetName ||
          p.last_name.toLowerCase() === targetName
        );

        if (!matched) {
          setCommandError(`Patient "${updateMatch[1]}" not found.`);
          return;
        }

        // map the stage
        let mappedStage: PatientStage = 'STAGE_1: FOLLOW_UP';
        if (rawStage.includes('FOLLOW') || rawStage.includes('STAGE_1')) mappedStage = 'STAGE_1: FOLLOW_UP';
        else if (rawStage.includes('APPOINTMENT') || rawStage.includes('SCHEDULED') || rawStage.includes('STAGE_2') || rawStage.includes('CLINICAL')) mappedStage = 'STAGE_2: APPOINTMENT_SCHEDULED';
        else if (rawStage.includes('PLAN') || rawStage.includes('SHARED') || rawStage.includes('STAGE_3')) mappedStage = 'STAGE_3: TREATMENT_PLAN_SHARED';
        else if (rawStage.includes('ACCEPT') || rawStage.includes('STAGE_4')) mappedStage = 'STAGE_4: TREATMENT_ACCEPTED';
        else if (rawStage.includes('PAYMENT') || rawStage.includes('COMPLETE') || rawStage.includes('EMI') || rawStage.includes('STAGE_5')) mappedStage = 'STAGE_5: PAYMENT_COMPLETED';

        // update on server
        const response = await fetch('/api/patients/manual-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: matched.patient_id,
            stage: mappedStage,
            notes: `Logged by staff | ${notesPart}`
          })
        });

        if (response.ok) {
          const result = await response.json();
          await fetchCRMData();
          setSelectedPatient(result.patient);
          setActiveView('PAGE_2');
          setCommandSuccess(`Successfully updated ${matched.first_name} ${matched.last_name} and moved to ${mappedStage}.`);
          setCommandInput('');
        } else {
          setCommandError('Failed to update patient on server.');
        }
        return;
      }

      setCommandError('Command format not matched. Check templates below.');
    } catch (err) {
      console.error(err);
      setCommandError('An error occurred.');
    }
  };
  const [aiResponseMarkdown, setAiResponseMarkdown] = useState<string>('');

  // Treatment Plan Module States
  const [activeCopilotTab, setActiveCopilotTab] = useState<'logger' | 'treatment'>('logger');
  const [treatmentNotes, setTreatmentNotes] = useState<string>('');
  const [treatmentGenerating, setTreatmentGenerating] = useState<boolean>(false);
  const [generatedTreatmentMarkdown, setGeneratedTreatmentMarkdown] = useState<string>('');
  const [generatedTreatmentJson, setGeneratedTreatmentJson] = useState<any>(null);
  const [showDevPayload, setShowDevPayload] = useState<boolean>(false);
  const [successApplyMessage, setSuccessApplyMessage] = useState<string>('');
  
  // Structured Builder States
  const [treatmentInputMode, setTreatmentInputMode] = useState<'builder' | 'text'>('builder');
  const [builderTreatmentList, setBuilderTreatmentList] = useState<any[]>([]);
  const [selectedPredefinedId, setSelectedPredefinedId] = useState<string>('scaling');
  const [customTreatmentName, setCustomTreatmentName] = useState<string>('');
  const [customTreatmentRate, setCustomTreatmentRate] = useState<number>(3000);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  
  // Create manual patient variables
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(1); // 1: Profile, 2: Book Appointment
  const [newSalutation, setNewSalutation] = useState<string>('Mr.');
  const [newFirstName, setNewFirstName] = useState<string>('');
  const [newLastName, setNewLastName] = useState<string>('');
  const [newGender, setNewGender] = useState<string>('Male');
  const [newMobile, setNewMobile] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newDob, setNewDob] = useState<string>('');
  const [newAge, setNewAge] = useState<string>('');
  const [newInitialNotes, setNewInitialNotes] = useState<string>('');
  
  // Appointment Details Setup
  const [doctors, setDoctors] = useState<{
    name: string;
    specialty: string;
    fees: number;
    phone?: string;
    email?: string;
    med_reg?: string;
    qualifications?: string;
    hospitals?: string[];
  }[]>([
    { name: "Dr. Amit Sharma", specialty: "General Dentistry", fees: 500, phone: "9876543210", email: "amit@clinic.com", med_reg: "DC-12345", qualifications: "BDS, MDS", hospitals: ["BTM"] },
    { name: "Dr. Priya Nair", specialty: "Orthodontics", fees: 1500, phone: "9988776655", email: "priya@clinic.com", med_reg: "DC-67890", qualifications: "MDS Orthodontics", hospitals: ["Koramangala"] },
    { name: "Dr. Rohan Das", specialty: "Endodontics", fees: 1200, phone: "9812345678", email: "rohan@clinic.com", med_reg: "DC-54321", qualifications: "MDS Endodontics", hospitals: ["ECity"] }
  ]);
  const [newSpeciality, setNewSpeciality] = useState<string>('General Dentistry');
  const [newDoctorName, setNewDoctorName] = useState<string>(''); // Default state of Recommended Dentist defaults to empty/null
  const [newConsultationFees, setNewConsultationFees] = useState<string>('0');

  // Simulated "+ Add Doctor" Pop-up state variables
  const [showAddDoctorModal, setShowAddDoctorModal] = useState<boolean>(false);
  const [addDocName, setAddDocName] = useState<string>('');
  const [addDocSpecialty, setAddDocSpecialty] = useState<string>('General Dentistry');
  const [addDocPhone, setAddDocPhone] = useState<string>('');
  const [addDocEmail, setAddDocEmail] = useState<string>('');
  const [addDocMedReg, setAddDocMedReg] = useState<string>('');
  const [addDocQualifications, setAddDocQualifications] = useState<string>('');
  const [addDocSelectedHospitals, setAddDocSelectedHospitals] = useState<string[]>([]);
  const [newBookingType, setNewBookingType] = useState<'Walk-in' | 'Online'>('Walk-in');
  const [newAppointmentSlot, setNewAppointmentSlot] = useState<string>('10:00 AM - 10:30 AM');
  const [newAppointmentDate, setNewAppointmentDate] = useState<string>(() => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return tom.toISOString().split('T')[0];
  });
  const [newPatientCategory, setNewPatientCategory] = useState<string>('General');
  const [newCaseType, setNewCaseType] = useState<string>('New Consultation');
  
  const [newStage, setNewStage] = useState<PatientStage>('STAGE_1: FOLLOW_UP');
  const [newTotalCost, setNewTotalCost] = useState<string>('');
  const [newPaymentMode, setNewPaymentMode] = useState<string>('Not Selected');

  // Trigger auto refresh from API
  const fetchCRMData = async () => {
    try {
      const resPatients = await fetch('/api/patients');
      const dataPatients = await resPatients.json();
      setPatients(dataPatients.patients);

      const resNotif = await fetch('/api/notifications');
      const dataNotif = await resNotif.json();
      setNotifications(dataNotif.notifications);

      const resDoctors = await fetch('/api/doctors');
      const dataDoctors = await resDoctors.json();
      if (dataDoctors && Array.isArray(dataDoctors.doctors)) {
        setDoctors(dataDoctors.doctors);
      }
    } catch (e) {
      console.error('Failed to grab CRM state from server: ', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCRMData();
    // Poll updates every 6 seconds to show dynamic notifications
    const interval = setInterval(fetchCRMData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Update selected patient info state when general patient array changes
  useEffect(() => {
    if (selectedPatient) {
      const updated = patients.find(p => p.patient_id === selectedPatient.patient_id);
      if (updated) {
        setSelectedPatient(updated);
      }
    }
  }, [patients]);

  // Reset builder state when active patient changes
  useEffect(() => {
    setBuilderTreatmentList([]);
    setSelectedTeeth([]);
    setSelectedPredefinedId('scaling');
    setCustomTreatmentName('');
    setCustomTreatmentRate(3000);
    setTreatmentInputMode('builder');
  }, [selectedPatient?.patient_id]);

  // Synchronize active role whenever current user context changes
  useEffect(() => {
    if (currentUser) {
      setActiveRole(currentUser.type);
    }
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('denta_current_user');
    setCurrentUser(null);
    setSelectedPatient(null);
  };

  // Restart data mock to presets
  const handleResetData = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('/api/patients/reset', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setPatients(data.patients);
        setNotifications(data.notifications);
        setSelectedPatient(null);
        setAiResponseMarkdown('');
        setAiInputText('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveNewDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanPhone = addDocPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      alert('The Phone Number must be exactly 10 digits.');
      return;
    }

    if (!addDocName.trim() || !addDocSpecialty || !addDocEmail.trim() || !addDocMedReg.trim() || !addDocQualifications.trim()) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    if (addDocSelectedHospitals.length === 0) {
      alert('Please select at least one physical clinic branch.');
      return;
    }

    const newDoc = {
      name: addDocName.startsWith('Dr.') ? addDocName.trim() : 'Dr. ' + addDocName.trim(),
      specialty: addDocSpecialty,
      fees: addDocSpecialty === 'Orthodontics' ? 1500 : addDocSpecialty === 'Endodontics' ? 1200 : 500,
      phone: cleanPhone,
      email: addDocEmail.trim(),
      med_reg: addDocMedReg.trim(),
      qualifications: addDocQualifications.trim(),
      hospitals: addDocSelectedHospitals
    };

    try {
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });
      const data = await res.json();
      if (data.doctors) {
        setDoctors(data.doctors);
        setNewDoctorName(newDoc.name);
        setNewConsultationFees(String(newDoc.fees));
      }
    } catch (err) {
      console.error('Error saving new doctor: ', err);
      setDoctors(prev => [...prev, newDoc]);
      setNewDoctorName(newDoc.name);
      setNewConsultationFees(String(newDoc.fees));
    }

    // Reset states
    setAddDocName('');
    setAddDocPhone('');
    setAddDocEmail('');
    setAddDocMedReg('');
    setAddDocQualifications('');
    setAddDocSelectedHospitals([]);
    setShowAddDoctorModal(false);
  };

  // Onboard new patient manually
  const handleManualOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onboardingStep === 1) {
      if (!newFirstName || !newLastName) {
        alert("First Name and Last Name are strictly mandatory.");
        return;
      }
      if (!newDob && !newAge) {
        alert("Please provide either Date of Birth or Age.");
        return;
      }
      if (!newMobile || newMobile.trim().length !== 10) {
        alert("Mobile number is strictly mandatory and must be exactly 10 digits.");
        return;
      }
      setOnboardingStep(2);
      return;
    }

    if (!newFirstName || !newLastName) return;
    if (!newDob && !newAge) {
      alert("Please provide either Date of Birth or Age.");
      return;
    }
    if (!newMobile || newMobile.trim().length !== 10) {
      alert("Mobile number is strictly mandatory and must be exactly 10 digits.");
      return;
    }

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salutation: newSalutation,
          first_name: newFirstName,
          last_name: newLastName,
          gender: newGender,
          mobile: newMobile,
          email: newEmail || 'Unspecified',
          dob: newDob || undefined,
          age_calculated: Number(newAge) || 0,
          age_dob: newAge ? `${newAge} years old` : '30 years old',
          current_stage: 'STAGE_2: APPOINTMENT_SCHEDULED', // Progresses directly to scheduled!
          history: [`Logged by Receptionist | Patient onboarded and booked in-clinic appointment with ${newDoctorName} (${newSpeciality}) on ${newAppointmentDate}.`],
          financials: {
            total_cost: 0,
            payment_mode: 'Not Selected',
            payment_status: 'Pending',
            emi_months: 0,
            emi_monthly_amount: 0
          },
          appointment_booking: {
            appointment_type: 'In-Clinic Appointment',
            speciality: newSpeciality,
            doctor_name: newDoctorName,
            consultation_fees: Number(newConsultationFees) || 0,
            booking_type: newBookingType,
            appointment_date: newAppointmentDate,
            patient_category: newPatientCategory,
            case_type: newCaseType,
            appointment_slot: newBookingType === 'Online' ? newAppointmentSlot : undefined
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchCRMData();
        // Clear state
        setNewSalutation('Mr.');
        setNewFirstName('');
        setNewLastName('');
        setNewDob('');
        setNewAge('');
        setNewMobile('');
        setNewEmail('');
        setNewInitialNotes('');
        setOnboardingStep(1);
        setShowAddModal(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Generate clinical treatment plan using the automation engine
  const handleGenerateTreatmentPlan = async () => {
    if (!treatmentNotes.trim()) return;

    setTreatmentGenerating(true);
    setSuccessApplyMessage('');
    try {
      const response = await fetch('/api/patients/treatment-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes_text: treatmentNotes })
      });
      const data = await response.json();
      setGeneratedTreatmentMarkdown(data.markdown);
      setGeneratedTreatmentJson(data.parsed);
    } catch (e) {
      console.error('Error generating treatment plan: ', e);
    } finally {
      setTreatmentGenerating(false);
    }
  };

  // Persists and applies compiled treatment plan to patient CRM file
  const handleApplyTreatmentPlan = async () => {
    if (!selectedPatient || !generatedTreatmentMarkdown || !generatedTreatmentJson) return;

    setTreatmentGenerating(true);
    try {
      const response = await fetch('/api/patients/update-treatment-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient.patient_id,
          markdown: generatedTreatmentMarkdown,
          json_payload: generatedTreatmentJson,
          grand_total: generatedTreatmentJson.grand_total_estimate || 0
        })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessApplyMessage('Success! Treatment plan shared and applied to patient case file.');
        // Update selected patient in view immediately
        setSelectedPatient(data.patient);
        // Clear generator states
        setTreatmentNotes('');
        setGeneratedTreatmentMarkdown('');
        setGeneratedTreatmentJson(null);
        await fetchCRMData();
        
        // Clear the success toast after 4 seconds
        setTimeout(() => {
          setSuccessApplyMessage('');
        }, 4000);
      }
    } catch (e) {
      console.error('Error applying treatment plan: ', e);
    } finally {
      setTreatmentGenerating(false);
    }
  };

  const handleToggleTooth = (tooth: number) => {
    setSelectedTeeth(prev => 
      prev.includes(tooth) 
        ? prev.filter(t => t !== tooth) 
        : [...prev, tooth].sort((a, b) => a - b)
    );
  };

  const handleRemoveLineItem = (index: number) => {
    setBuilderTreatmentList(prev => 
      prev.filter((_, idx) => idx !== index)
          .map((item, idx) => ({ ...item, s_no: idx + 1 }))
    );
  };

  const handleSaveBuilderPlan = async () => {
    if (!selectedPatient || builderTreatmentList.length === 0) return;

    setTreatmentGenerating(true);
    setSuccessApplyMessage('');
    try {
      const grandTotal = builderTreatmentList.reduce((sum, item) => sum + item.estimate, 0);
      
      let markdown = '## 🦷 Treatment Plan Breakdown\n\n';
      markdown += '| S.No | Treatment | Tooth No. | Rate | Count | Estimate |\n';
      markdown += '| :--- | :--- | :--- | :--- | :--- | :--- |\n';
      
      builderTreatmentList.forEach(item => {
        const toothStr = item.tooth_numbers.join(', ');
        const customSuffix = item.is_custom ? ' [Custom]' : '';
        markdown += `| ${item.s_no} | ${item.treatment_name}${customSuffix} | ${toothStr} | ₹${item.rate.toLocaleString()} | ${item.count} | ₹${item.estimate.toLocaleString()} |\n`;
      });
      
      markdown += `\n### 🧾 Financial Grand Total\n`;
      markdown += `* **Total Estimated Treatment Cost:** **₹${grandTotal.toLocaleString()}**\n\n`;
      
      const devPayload = {
        treatment_plan: builderTreatmentList.map(item => ({
          s_no: item.s_no,
          treatment_name: item.treatment_name,
          is_custom: item.is_custom,
          tooth_numbers: item.tooth_numbers,
          rate: item.rate,
          count: item.count,
          estimate: item.estimate
        })),
        grand_total_estimate: grandTotal
      };
      
      markdown += '### 💾 DEVELOPER EXPORT PAYLOAD (JSON)\n';
      markdown += '```json\n';
      markdown += JSON.stringify(devPayload, null, 2);
      markdown += '\n```\n';

      const response = await fetch('/api/patients/update-treatment-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient.patient_id,
          markdown: markdown,
          json_payload: devPayload,
          grand_total: grandTotal
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccessApplyMessage('Success! Treatment plan shared and applied to patient case file.');
        setSelectedPatient(data.patient);
        setBuilderTreatmentList([]);
        setSelectedTeeth([]);
        await fetchCRMData();
        
        setTimeout(() => {
          setSuccessApplyMessage('');
        }, 4000);
      }
    } catch (e) {
      console.error('Error applying builder treatment plan: ', e);
    } finally {
      setTreatmentGenerating(false);
    }
  };

  // Submit log update via server-side AI Intelligent Engine
  const handleAISubmit = async () => {
    if (!aiInputText.trim()) return;

    setAiLoading(true);
    try {
      const response = await fetch('/api/patients/ai-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: aiInputText,
          current_patient_state: selectedPatient || null
        })
      });

      const data = await response.json();
      setAiResponseMarkdown(data.markdown);
      
      // Auto-toggle "+ Add Doctor" pop-up modal if requested by the AI state layer
      if (data.markdown) {
        const jsonMatch = data.markdown.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            const stateObj = JSON.parse(jsonMatch[1]);
            if (stateObj.ui_popups && stateObj.ui_popups.add_doctor_modal_open === true) {
              setShowAddDoctorModal(true);
              if (stateObj.current_booking_view && stateObj.current_booking_view.selected_specialty) {
                setAddDocSpecialty(stateObj.current_booking_view.selected_specialty);
              }
            }
          } catch(e) {
            // ignore
          }
        }
      }

      // Keep state locally in synch
      if (data.parsed_patient) {
        setSelectedPatient(data.parsed_patient);
      }
      
      await fetchCRMData();
      setAiInputText('');
    } catch (e) {
      console.error('Error running AI patient journey updates: ', e);
    } finally {
      setAiLoading(false);
    }
  };

  // Drag and drop or direct stage move trigger for immediate client feedback
  const handleMoveStage = async (patient: Patient, next_stage: PatientStage) => {
    // Generate simulated clinical text so backend parses as if a receptionist changed the stage
    const action_by = activeRole === 'doctor' ? 'Senior Doctor' : 'Receptionist';
    const log = `${action_by} updated: Patient moved directly to ${next_stage}.`;
    
    setLoading(true);
    try {
      const response = await fetch('/api/patients/ai-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: log,
          current_patient_state: patient
        })
      });
      const data = await response.json();
      await fetchCRMData();
      if (selectedPatient?.patient_id === patient.patient_id) {
        setSelectedPatient(data.parsed_patient);
        setAiResponseMarkdown(data.markdown);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Direct quick clinic log simulation presets for instant testing
  const runOnboardingTest = (prompt: string, targetPat: Patient | null) => {
    if (targetPat) {
      setSelectedPatient(targetPat);
    }
    setAiInputText(prompt);
  };

  // Financial Analytics Calculations for Senior Doctor (Admin)
  const totalCostPortfolio = patients.reduce((acc, p) => acc + p.financials.total_cost, 0);
  const realizedRevenue = patients.reduce((acc, p) => {
    if (p.financials.payment_status === 'Fully Paid') {
      return acc + p.financials.total_cost;
    } else if (p.financials.payment_status === 'Active EMI' && p.financials.emi_months > 0) {
      // simulate 1 month collected revenue
      return acc + p.financials.emi_monthly_amount;
    }
    return acc;
  }, 0);
  const emiPortfolioValue = patients.reduce((acc, p) => p.financials.payment_status === 'Active EMI' ? acc + p.financials.total_cost : acc, 0);
  const pendingRecovery = totalCostPortfolio - realizedRevenue;

  // Render Kanji/Column list representing pipeline state
  const lifecycleStages: { key: PatientStage; title: string; color: string; desc: string }[] = [
    { key: 'STAGE_1: FOLLOW_UP', title: 'Follow Up', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'Assessing patient dental needs' },
    { key: 'STAGE_2: APPOINTMENT_SCHEDULED', title: 'Clinical Appt', color: 'bg-sky-50 text-sky-700 border-sky-200', desc: 'Consultation date is locked' },
    { key: 'STAGE_3: TREATMENT_PLAN_SHARED', title: 'Plan Shared', color: 'bg-amber-50 text-amber-700 border-amber-200', desc: 'Proposed treatment & cost shared' },
    { key: 'STAGE_4: TREATMENT_ACCEPTED', title: 'Plan Accepted', color: 'bg-purple-50 text-purple-700 border-purple-200', desc: 'Formally accepted treatment' },
    { key: 'STAGE_5: PAYMENT_COMPLETED', title: 'Paid / Active EMI', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', desc: 'Funds collected or EMI plan live' }
  ];

  if (!currentUser) {
    return (
      <LoginOnboarding 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('denta_current_user', JSON.stringify(user));
        }} 
      />
    );
  }

  return (
    <div id="crm-app-root" className="min-h-screen bg-slate-100 flex flex-col font-sans p-4 sm:p-6 md:p-8">
      
      {/* 1. BRANDED MAIN HEADER */}
      <header id="crm-app-header" className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center bg-white rounded-2xl p-4 mb-6 shadow-sm border border-slate-200 gap-4">
        
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm tracking-tighter">D</div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-none">DentaCare Intelligence</h1>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Practice Management CRM v2.5</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto justify-end">
          
          <div className="text-right px-4 border-r border-slate-100 hidden lg:block">
            <p className="text-xs text-slate-500">Operational Mode</p>
            <p className="text-sm font-medium text-emerald-600 uppercase tracking-tight">Live Backend Active</p>
          </div>

          {/* Active User Switcher customized to match the theme */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 text-[11px] font-bold border border-slate-200">
            <button
              id="role-staff-button"
              onClick={() => {
                setActiveRole('staff');
                setSelectedPatient(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeRole === 'staff' 
                  ? 'bg-white text-slate-800 shadow-xs border-b border-slate-200' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="h-3.5 w-3.5 text-indigo-500" />
              Staff
            </button>
            <button
              id="role-doctor-button"
              onClick={() => {
                setActiveRole('doctor');
                setSelectedPatient(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeRole === 'doctor' 
                  ? 'bg-white text-slate-800 shadow-xs border-b border-slate-200' 
                  : 'text-slate-500 hover:text-slate-805'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              Doctor Admin
            </button>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">
                {currentUser 
                  ? `${currentUser.type === 'doctor' ? 'Dr. ' : ''}${currentUser.first_name} ${currentUser.last_name}` 
                  : (activeRole === 'doctor' ? 'Dr. Sarah Jenkins' : 'Clara Oswald')}
              </p>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                {currentUser 
                  ? (currentUser.type === 'doctor' ? 'Senior Dental MD' : 'Practice Staff') 
                  : (activeRole === 'doctor' ? 'Senior Dental MD' : 'Practice Manager')}
              </p>
            </div>
            <div className={`w-8 h-8 rounded-full border-2 ${activeRole === 'doctor' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50'} flex items-center justify-center font-bold text-xs text-slate-700`}>
              {currentUser 
                ? `${currentUser.first_name[0].toUpperCase()}${currentUser.last_name[0].toUpperCase()}` 
                : (activeRole === 'doctor' ? 'SJ' : 'CO')}
            </div>
          </div>

          {/* Reset CRM State Button */}
          <button
            id="reset-state-button"
            onClick={handleResetData}
            disabled={isResetting}
            className="p-2 text-slate-400 hover:text-indigo-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1"
            title="Reset state back to rahul and priya presets"
          >
            <RefreshCw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
          </button>

          {/* Sign Out Authentication Option */}
          <button
            id="auth-logout-button"
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-650 border border-slate-200 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-1"
            title="Sign out of practice portal"
          >
            <X className="h-4 w-4" />
          </button>
          
        </div>
      </header>

      {/* 2. SUPER ADMIN DOCTOR KPIs PILLS */}
      <section id="crm-metrics-strip" className="max-w-7xl mx-auto w-full pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Est. Case Value</p>
              <h3 className="text-2xl font-bold font-display text-slate-800 mt-1">₹{totalCostPortfolio.toLocaleString()}</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{patients.length} Registered Patients</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Realized Income (Collected)</p>
              <h3 className="text-2xl font-bold font-display text-emerald-600 mt-1">₹{realizedRevenue.toLocaleString()}</h3>
              <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-1 font-bold">Paid + Month 1 EMIs</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EMI Book Value (Deferred)</p>
              <h3 className="text-2xl font-bold font-display text-indigo-600 mt-1">₹{emiPortfolioValue.toLocaleString()}</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Active Monthly Installments</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Treatments Overdue</p>
              <h3 className="text-2xl font-bold font-display text-slate-700 mt-1">₹{pendingRecovery.toLocaleString()}</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5 font-sans">Outstanding in pipeline</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>

        </div>
      </section>



      {/* 4. CLINIC CRM WORKSPACE GRID */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Dynamic viewport depending on activeView page state machine */}
        <div className="lg:col-span-12 font-sans">
          {activeView === 'PAGE_1' ? (
            <MasterDirectory
              patients={patients}
              onSelectPatient={(p) => {
                setSelectedPatient(p);
                setActiveView('PAGE_2');
                setAiResponseMarkdown('');
              }}
              onOpenOnboardModal={() => setShowAddModal(true)}
            />
          ) : (
            selectedPatient && (
              <PatientDeepDive
                selectedPatient={selectedPatient}
                onBackToDirectory={() => {
                  setSelectedPatient(null);
                  setActiveView('PAGE_1');
                }}
                onUpdateStage={handleMoveStage}
                SYSTEM_DENTAL_PROCEDURES={SYSTEM_DENTAL_PROCEDURES}
                selectedPredefinedId={selectedPredefinedId}
                setSelectedPredefinedId={setSelectedPredefinedId}
                customTreatmentName={customTreatmentName}
                setCustomTreatmentName={setCustomTreatmentName}
                customTreatmentRate={customTreatmentRate}
                setCustomTreatmentRate={setCustomTreatmentRate}
                selectedTeeth={selectedTeeth}
                onToggleTooth={handleToggleTooth}
                onSelectAllTeeth={() => {
                  const ageVal = getPatientAgeValue(selectedPatient?.age_dob);
                  const all = ageVal <= 13 
                    ? [61, 62, 63, 64, 65, 51, 52, 53, 54, 55, 81, 82, 83, 84, 85, 71, 72, 73, 74, 75]
                    : [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 41, 42, 43, 44, 45, 46, 47, 48, 31, 32, 33, 34, 35, 36, 37, 38];
                  setSelectedTeeth(all);
                }}
                onClearTeeth={() => setSelectedTeeth([])}
                handleApplyTreatmentPlan={handleApplyTreatmentPlan}
                aiInputText={aiInputText}
                setAiInputText={setAiInputText}
                handleAISubmit={handleAISubmit}
                aiLoading={aiLoading}
                onAppendNote={async (noteText) => {
                  const response = await fetch('/api/patients/manual-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      patient_id: selectedPatient.patient_id,
                      notes: `Logged by Dentist | ${noteText}`
                    })
                  });
                  if (response.ok) {
                    const resData = await response.json();
                    await fetchCRMData();
                    setSelectedPatient(resData.patient);
                  }
                }}
              />
            )
          )}
        </div>

        {/* Short circuit standard workspace renderer to avoid duplicated DOM rendering */}
        {true ? null : (
          <>
            {/* LEFT SECTIONS: PIPELINE AND DATA ADD/REMOVE */}
            <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* PIPELINE CONTROLS HEADER */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
            <div className="flex-grow">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 font-display">
                <Users className="h-4 w-4 text-indigo-600" />
                Patient Lifecycle Pipeline
              </h2>
              <p className="text-xs text-slate-500 font-medium">Visual Kanban matrix. Click on a patient to activate the AI State Co-pilot.</p>
            </div>
            
            <button
              id="onboard-patient-trigger"
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Onboard Patient (Manual)
            </button>
          </div>

          {loading ? (
            <div className="h-80 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-7 w-7 text-indigo-650 animate-spin" />
                <span className="text-xs text-slate-500 font-mono font-medium">Synchronizing CRM registers...</span>
              </div>
            </div>
          ) : (
            
            /* 5 LOB LIFECYCLE PIPELINE MATRIX */
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
              {lifecycleStages.map((stage) => {
                const stagePatients = patients.filter(p => p.current_stage === stage.key);
                return (
                  <div 
                    key={stage.key} 
                    className="flex flex-col rounded-2xl bg-slate-200/30 p-2.5 min-h-[400px] border border-slate-200/40"
                  >
                    {/* Stage Header */}
                    <div className="px-3 py-2 mb-3 rounded-xl border border-slate-200/60 bg-white shadow-xs">
                      <div className="flex justify-between items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-700 truncate" title={stage.title}>
                          {stage.title}
                        </span>
                        <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded-full text-slate-500 border border-slate-200/55">
                          {stagePatients.length}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1 leading-normal font-bold uppercase tracking-wider truncate" title={stage.desc}>{stage.desc.replace('Patient', '')}</p>
                    </div>

                    {/* Patient Cards inside the Column */}
                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                      {stagePatients.length > 0 ? (
                        stagePatients.map((patient) => {
                          const isSelected = selectedPatient?.patient_id === patient.patient_id;
                          return (
                            <div
                              key={patient.patient_id}
                              onClick={() => {
                                setSelectedPatient(patient);
                                setAiResponseMarkdown('');
                              }}
                              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 relative overflow-hidden ${
                                isSelected 
                                  ? 'bg-white border-indigo-500 ring-2 ring-indigo-50 shadow-sm pl-4.5' 
                                  : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-xs hover:shadow-xs'
                              }`}
                            >
                              {/* Left status accent bar on selected active card */}
                              {isSelected && (
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-650" />
                              )}

                              <div className="flex justify-between items-start gap-1">
                                <h4 className="text-xs font-bold text-slate-800 truncate">
                                  {patient.first_name} {patient.last_name}
                                </h4>
                                <span className="text-[9px] text-slate-500 bg-slate-150 font-bold px-1.5 py-0.2 rounded border border-slate-200/40 truncate">
                                  {patient.gender[0]}|{patient.age_dob.match(/\d+/)?.[0] || 'N/A'}
                                </span>
                              </div>
                              
                              {/* Financial Badge snippet inside list */}
                              {patient.financials.total_cost > 0 && (
                                <div className="mt-2 flex items-center justify-between text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-150">
                                  <span className="font-mono font-bold text-slate-600">₹{patient.financials.total_cost.toLocaleString()}</span>
                                  <span className={`font-bold px-1.5 py-0.2 rounded text-[8px] border ${
                                    patient.financials.payment_status === 'Active EMI' ? 'bg-indigo-50 text-indigo-800 border-indigo-100' :
                                    patient.financials.payment_status === 'Fully Paid' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100'
                                  }`}>
                                    {patient.financials.payment_mode === 'EMI' ? `${patient.financials.emi_months}M EMI` : patient.financials.payment_mode}
                                  </span>
                                </div>
                              )}

                              <p className="text-[10px] text-slate-500 line-clamp-2 mt-2 leading-relaxed border-t border-slate-100 pt-2 font-medium">
                                {patient.history[patient.history.length - 1]?.replace(/Logged by.*\|/, '').trim() || 'No activity log.'}
                              </p>

                              {/* Click actions to transition manually */}
                              <div className="mt-2.5 text-right hidden sm:block">
                                <select
                                  value={patient.current_stage}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleMoveStage(patient, e.target.value as PatientStage);
                                  }}
                                  className="text-[9px] bg-slate-100 focus:bg-white text-slate-600 font-bold px-1.5 py-0.5 border border-slate-200 rounded-lg outline-none cursor-pointer hover:border-slate-350"
                                >
                                  {lifecycleStages.map(op => (
                                    <option key={op.key} value={op.key}>{op.title}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })
                        ) : (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-4">
                          <span className="text-[10px] text-slate-400 font-mono">Empty Column</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* QUICK PROMPT CO-PILOT SIMULATOR BAR */}
          <div className="bg-slate-900 rounded-2xl p-6 text-slate-100 shadow-md border border-slate-800">
            <h3 className="text-sm font-bold font-display text-indigo-400 flex items-center gap-1.5 mb-1.5">
              <Sparkles className="h-4 w-4 animate-pulse text-indigo-400" />
              Clinic Clinical Logs & Validation Demonstrator
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed font-sans">
              Below are ready-to-use clinical entries mimicking receptionists and junior doctors. Click any prompt to prefill the state machine input textarea!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <button
                onClick={() => runOnboardingTest(`Receptionist: Add new patient Rahul Verma, Male, 31 years old. He called inquiring about teeth whitening costs. Currently following up with him.`, null)}
                className="bg-slate-800 hover:bg-slate-750 hover:border-indigo-500/50 border border-slate-800/80 text-left p-3.5 rounded-xl text-xs leading-relaxed transition-all cursor-pointer text-slate-200"
              >
                <div className="font-bold text-[10px] text-indigo-300 uppercase tracking-widest mb-1">STAGE 1: Onboard New Patient</div>
                "Receptionist: Add new patient Rahul Verma, Male, 31 years old. He called inquiring..."
              </button>
              
              <button
                onClick={() => {
                  const target = patients.find(p => p.first_name === 'Rahul') || null;
                  runOnboardingTest(`Junior Doctor: Updated Rahul Verma. He came in for an appt. We shared a treatment plan of ₹24,000. He accepted it on the spot and wants to convert it into a 6-month EMI plan.`, target);
                }}
                className="bg-slate-800 hover:bg-slate-750 hover:border-indigo-500/50 border border-slate-800/80 text-left p-3.5 rounded-xl text-xs leading-relaxed transition-all cursor-pointer text-slate-200"
              >
                <div className="font-bold text-[10px] text-indigo-300 uppercase tracking-widest mb-1">STAGE 5: Structured EMI Calculation</div>
                "Junior Doctor: Updated Rahul Verma. Shared treatment plan ₹24,000. Accepted and wants 6-month EMI."
              </button>
 
              <button
                onClick={() => {
                  const target = patients.find(p => p.first_name === 'Rohan') || null;
                  runOnboardingTest(`Junior Doctor: Patient Rohan Das came in. We took diagnostic impressions, and he accepted the metal-ceramic crown. Total costing ₹35,000. He requested EMI mode option.`, target);
                }}
                className="bg-slate-800 hover:bg-slate-750 hover:border-amber-500/50 border border-slate-800/80 text-left p-3.5 rounded-xl text-xs leading-relaxed transition-all cursor-pointer text-slate-200"
              >
                <div className="font-bold text-[10px] text-amber-400 uppercase tracking-widest mb-1">⚠️ INTERCEPT TRIGGER: Missing Months Error</div>
                "Junior Doctor: Rohan Das accepted treatment ₹35,000. Requested EMI mode." (Months missing)
              </button>
 
              <button
                onClick={() => {
                  const target = patients.find(p => p.first_name === 'Priya') || null;
                  runOnboardingTest(`Receptionist: Scheduled consultation date lock-in for Priya Sharma. Slot set for Wednesday, June 10th at 10:00 AM under junior doctor duties.`, target);
                }}
                className="bg-slate-800 hover:bg-slate-750 hover:border-indigo-500/50 border border-slate-800/80 text-left p-3.5 rounded-xl text-xs leading-relaxed transition-all cursor-pointer text-slate-200"
              >
                <div className="font-bold text-[10px] text-indigo-300 uppercase tracking-widest mb-1">STAGE 2: Lock Clinical Appt</div>
                "Receptionist: Scheduled consultation date lock-in for Priya Sharma. Slot set..."
              </button>
            </div>
          </div>
 
        </div>
 
        {/* RIGHT SECTION: ACTIVE PATIENT DETAIL & INTELLIGENT AI TERMINAL */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* DETAILED ACTIVE PATIENT CO-PILOT CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6 flex-1 flex flex-col min-h-[500px]">
            
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-bold font-display text-sm tracking-wide flex items-center gap-1.5 text-slate-100">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  AI Intellisense Co-Pilot
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Standardized journey compiler & transition validator</p>
              </div>
              {selectedPatient && (
                <button 
                  onClick={() => {
                    setSelectedPatient(null);
                    setAiResponseMarkdown('');
                  }} 
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* If no patient is chosen */}
            {!selectedPatient ? (
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 animate-bounce">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Patient Activated</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                  Click on any patient card in the lifecycle pipeline to run AI stage updates, structured EMI, or review the comprehensive clinical logs.
                </p>
                <div className="mt-6 border-t border-slate-100 pt-5 w-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-3">Or test onboarding</p>
                  <button 
                    onClick={() => {
                      setNewFirstName('Rahul');
                      setNewLastName('Verma');
                      setNewAge('31');
                      setShowAddModal(true);
                    }}
                    className="w-full text-center py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-indigo-600 font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" /> Onboard Rahul Verma Preset
                  </button>
                </div>
              </div>
            ) : (
            
            /* Patient Selected - Workspace */
            <div className="flex-1 flex flex-col overflow-y-auto">

              {/* Active Patient Details Top bar */}
              <div className="p-5 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-600/15 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-sm">
                    {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-800 truncate border-0 pb-0">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </h4>
                    <p className="text-xs text-slate-500 font-semibold">
                      {selectedPatient.gender} | {selectedPatient.age_dob}
                    </p>
                  </div>
                </div>

                {/* Curated Lifecycle Stage Indicator & Dynamic Segment Bar */}
                <div className="mt-4 bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lifecycle Stage</span>
                      <span className="text-xs font-bold text-slate-800">
                        {selectedPatient.current_stage.replace('STAGE_', 'STAGE ')}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-250/30">
                      ACTIVE FILE
                    </span>
                  </div>

                  {/* Step-by-step progress segment indicator matching the Sleek layout */}
                  <div className="pt-2.5 border-t border-slate-100">
                    <div className="flex justify-between mb-2 text-[8px] font-black uppercase text-slate-400 tracking-wider">
                      {(() => {
                        const getStageNumber = (st: PatientStage) => {
                          if (st === 'STAGE_1: FOLLOW_UP') return 1;
                          if (st === 'STAGE_2: APPOINTMENT_SCHEDULED') return 2;
                          if (st === 'STAGE_3: TREATMENT_PLAN_SHARED') return 3;
                          if (st === 'STAGE_4: TREATMENT_ACCEPTED') return 4;
                          if (st === 'STAGE_5: PAYMENT_COMPLETED') return 5;
                          return 1;
                        };
                        const num = getStageNumber(selectedPatient.current_stage);
                        return (
                          <>
                            <span className={num >= 1 ? "text-indigo-650 font-bold" : ""}>Follow-Up</span>
                            <span className={num >= 2 ? "text-indigo-650 font-bold" : ""}>Appt</span>
                            <span className={num >= 3 ? "text-indigo-650 font-bold" : ""}>Plan</span>
                            <span className={num >= 4 ? "text-indigo-650 font-bold" : ""}>Accepted</span>
                            <span className={num >= 5 ? "text-indigo-650 font-bold" : ""}>Payment</span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden p-[1px] border border-slate-200/50">
                      {(() => {
                        const getStageNumber = (st: PatientStage) => {
                          if (st === 'STAGE_1: FOLLOW_UP') return 1;
                          if (st === 'STAGE_2: APPOINTMENT_SCHEDULED') return 2;
                          if (st === 'STAGE_3: TREATMENT_PLAN_SHARED') return 3;
                          if (st === 'STAGE_4: TREATMENT_ACCEPTED') return 4;
                          if (st === 'STAGE_5: PAYMENT_COMPLETED') return 5;
                          return 1;
                        };
                        const num = getStageNumber(selectedPatient.current_stage);
                        return [1, 2, 3, 4, 5].map((s) => (
                          <div 
                            key={s} 
                            className={`h-full flex-1 rounded-sm border-r border-white last:border-0 transition-all duration-300 ${
                              num >= s ? 'bg-indigo-600' : 'bg-slate-200'
                            }`} 
                          />
                        ));
                      })()}
                    </div>
                  </div>
                </div>

              </div>

              {/* Patient Case Logs with custom vertical timeline layout */}
              <div className="p-5 border-b border-slate-200 flex-1 flex flex-col min-h-[160px]">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    Patient Case File Logs
                  </h5>
                  <span className="text-[10px] text-slate-500 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-mono">{selectedPatient.history.length} Events</span>
                </div>
                
                {/* Sleek chronological timeline tracker */}
                <div className={`${activeRole === 'doctor' ? 'max-h-[350px]' : 'max-h-[160px]'} overflow-y-auto pr-1 space-y-4`}>
                  {selectedPatient.history.map((h, i) => {
                    const isLatest = i === selectedPatient.history.length - 1;
                    const parts = h.split('|');
                    const roleAndTime = parts[0] ? parts[0].trim() : `Shift Log ${i + 1}`;
                    const message = parts[1] ? parts[1].trim() : h;
                    
                    return (
                      <div key={i} className="flex gap-3 text-left">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full border-2 border-white flex items-center justify-center shrink-0 ${
                            isLatest 
                              ? 'bg-indigo-600 ring-4 ring-indigo-50' 
                              : 'bg-slate-300'
                          }`} />
                          {i < selectedPatient.history.length - 1 && (
                            <div className="w-0.5 flex-1 bg-slate-100 my-1" />
                          )}
                        </div>
                        
                        <div className={`flex-1 ${
                          isLatest 
                            ? 'bg-indigo-550/5 rounded-xl p-3 border border-indigo-100/80 shadow-xs' 
                            : 'pb-1 border-b border-slate-100'
                        }`}>
                          <p className={`text-[10px] font-bold ${isLatest ? 'text-indigo-600 uppercase tracking-tight mb-0.5' : 'text-slate-400'}`}>
                            {roleAndTime}
                          </p>
                          <p className={`text-xs ${isLatest ? 'text-slate-800 font-semibold leading-relaxed' : 'text-slate-600 leading-normal'}`}>
                            {message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Financial Dark Card matching template parameters exactly */}
                <div className="mt-5 bg-slate-950 rounded-2xl p-5 text-white shadow-xl flex flex-col gap-4.5 border border-slate-850">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Total Treatment Case Quote</span>
                      <span className="text-lg font-bold font-mono text-indigo-400 mt-0.5 block tracking-wide">
                        {selectedPatient.financials.total_cost > 0 ? `₹${selectedPatient.financials.total_cost.toLocaleString()}` : 'Not Prescribed'}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase border ${
                      selectedPatient.financials.payment_status === 'Active EMI' ? 'bg-indigo-950/65 text-indigo-300 border-indigo-500/30' :
                      selectedPatient.financials.payment_status === 'Fully Paid' ? 'bg-emerald-950/65 text-emerald-300 border-emerald-550/30' : 
                      'bg-slate-900 text-slate-350 border-slate-800'
                    }`}>
                      {selectedPatient.financials.payment_status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-3">
                    <span className="text-slate-400 font-medium">Billing Arrangement</span>
                    <span className="font-bold text-slate-200 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px]">
                      {selectedPatient.financials.payment_mode === 'EMI' ? 'Structured Zero-Cost EMI' : selectedPatient.financials.payment_mode}
                    </span>
                  </div>

                  {selectedPatient.financials.payment_mode === 'EMI' && (
                    <div className="bg-indigo-950/40 border border-indigo-500/20 p-3.5 rounded-xl flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-indigo-300 font-extrabold uppercase tracking-widest">EMI Monthly Schedule</span>
                        <span className="text-[9px] bg-indigo-500 text-white font-extrabold px-1.5 py-0.2 rounded leading-none">LOCKED</span>
                      </div>
                      
                      <div className="flex justify-between items-baseline mt-1">
                        <span className="text-sm font-black text-indigo-200">
                          ₹{selectedPatient.financials.emi_monthly_amount.toLocaleString()} <span className="text-[9px] text-slate-400 font-normal">/ month</span>
                        </span>
                        <span className="text-xs font-mono text-slate-300">{selectedPatient.financials.emi_months} Mos Tenure</span>
                      </div>

                      <div className="w-full bg-slate-900 h-1.5 rounded-full flex gap-1 justify-between p-[1px] mt-1">
                        {Array.from({ length: selectedPatient.financials.emi_months }).map((_, idx) => (
                          <div key={idx} className="h-full flex-grow rounded-[2px] bg-indigo-550 transition-all" />
                        ))}
                      </div>
                      
                      <p className="text-[9px] text-slate-400 italic">Financial agreement vetted, with secure pipeline checkpoints.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Co-pilot Action Workspace with Tabs */}
              <div className="border-t border-slate-150">
                
                {/* Tabs Header */}
                <div className="flex bg-slate-50 border-b border-slate-200 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveCopilotTab('logger')}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeCopilotTab === 'logger'
                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/85'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    AI Journey Logger
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCopilotTab('treatment')}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeCopilotTab === 'treatment'
                        ? 'bg-indigo-650 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Treatment Plan Creator
                  </button>
                </div>

                {/* Tab content 1: Journey Log Updates */}
                {activeCopilotTab === 'logger' && (
                  <div className="p-5 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <label id="ai-entry-label" className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                        Append Clinical Log Note
                      </label>
                      <span className="text-[9px] font-extrabold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200/50 uppercase font-mono">
                        JOURNEY COMPILE
                      </span>
                    </div>

                    <div className="relative">
                      <textarea
                        id="ai-copilot-input"
                        value={aiInputText}
                        onChange={(e) => setAiInputText(e.target.value)}
                        placeholder="e.g. Rahul Verma accepted plan ₹24,000, 6-month EMI mode."
                        className="w-full h-24 p-3 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none font-sans leading-relaxed resize-none text-slate-800 shadow-xs"
                      />
                      <button
                        id="ai-submit-button"
                        onClick={handleAISubmit}
                        disabled={aiLoading || !aiInputText.trim()}
                        className="absolute right-2.5 bottom-2.5 bg-slate-950 hover:bg-slate-900 text-white p-2.5 rounded-xl transition-all flex items-center justify-center disabled:bg-slate-100 disabled:text-slate-400 shadow-sm cursor-pointer border-0 outline-none"
                      >
                        {aiLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                        ) : (
                          <Send className="h-3.5 w-3.5 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab content 2: Treatment Plan Creator */}
                {activeCopilotTab === 'treatment' && selectedPatient && (
                  <div className="p-5 bg-indigo-50/10">
                    
                    {/* Stored Plan View */}
                    {selectedPatient.treatment_plan_markdown && !generatedTreatmentMarkdown && (
                      <div className="mb-4 bg-white p-4 rounded-xl border border-indigo-100 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-150 pb-2 mb-3">
                          <h6 className="text-[11px] font-black uppercase text-indigo-650 tracking-wider flex items-center gap-1 leading-none">
                            <CheckCircle className="h-3.5 w-3.5" /> Stored Treatment Plan
                          </h6>
                          <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-255 uppercase px-1.5 py-0.5 rounded font-black leading-none">Active</span>
                        </div>
                        <div className="text-xs text-slate-700 leading-normal font-sans prose max-w-none">
                          <ReactMarkdown>{selectedPatient.treatment_plan_markdown}</ReactMarkdown>
                        </div>
                        
                        <div className="mt-3 border-t border-slate-100 pt-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setTreatmentNotes(`Composite Filling on teeth 11, 12, and 21. Rate is 1500 per tooth. Custom Deep Laser Sterilization on tooth 46 priced at 3000.`);
                              setGeneratedTreatmentMarkdown('');
                              setGeneratedTreatmentJson(null);
                            }}
                            className="text-[10px] text-indigo-650 font-black hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <RefreshCw className="h-3 w-3" /> Re-construct / override plan
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Toggle between "Structured Builder" and "AI Clinical Notes Parser (Text)" */}
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mb-4">
                      <button
                        type="button"
                        onClick={() => setTreatmentInputMode('builder')}
                        className={`flex-1 py-1.5 text-center text-[10.5px] uppercase tracking-wider font-black rounded-lg transition-all cursor-pointer border-0 outline-none ${
                          treatmentInputMode === 'builder'
                            ? 'bg-indigo-650 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        🔨 Structured Builder
                      </button>
                      <button
                        type="button"
                        onClick={() => setTreatmentInputMode('text')}
                        className={`flex-1 py-1.5 text-center text-[10.5px] uppercase tracking-wider font-black rounded-lg transition-all cursor-pointer border-0 outline-none ${
                          treatmentInputMode === 'text'
                            ? 'bg-indigo-650 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        ✍️ AI Copilot Notes (Text)
                      </button>
                    </div>

                    {treatmentInputMode === 'builder' ? (
                      <div className="flex flex-col gap-4">
                        
                        {/* Selector Heading */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200/85 shadow-xs flex flex-col gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                              1. Select Dental Treatment
                            </label>
                            
                            <select
                              value={selectedPredefinedId}
                              onChange={(e) => {
                                setSelectedPredefinedId(e.target.value);
                                if (e.target.value !== 'custom') {
                                  setCustomTreatmentName('');
                                }
                              }}
                              className="w-full text-xs bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-semibold text-slate-800"
                            >
                              <optgroup label="Auto-Billing Predefined Procedures">
                                {SYSTEM_DENTAL_PROCEDURES.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} — ₹{p.rate.toLocaleString()}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Other Options">
                                <option value="custom">✨ Option to "Add Custom" treatment...</option>
                              </optgroup>
                            </select>
                          </div>

                          {/* Custom input panel if selecting Other/Custom */}
                          {selectedPredefinedId === 'custom' && (
                            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-250 animate-fadeIn">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Custom Name</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Laser Root Therapy"
                                  value={customTreatmentName}
                                  onChange={(e) => setCustomTreatmentName(e.target.value)}
                                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Custom Rate (₹)</label>
                                <input
                                  type="number"
                                  placeholder="3000"
                                  value={customTreatmentRate}
                                  onChange={(e) => setCustomTreatmentRate(Number(e.target.value))}
                                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold"
                                />
                              </div>
                            </div>
                          )}

                          {/* FDI Teeth Selector */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1">
                                2. Select Tooth Numbers
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const ageVal = getPatientAgeValue(selectedPatient?.age_dob);
                                    const all = ageVal <= 13 
                                      ? [...FDI_CHILD_UPPER_RIGHT, ...FDI_CHILD_UPPER_LEFT, ...FDI_CHILD_LOWER_RIGHT, ...FDI_CHILD_LOWER_LEFT]
                                      : [...FDI_ADULT_UPPER_RIGHT, ...FDI_ADULT_UPPER_LEFT, ...FDI_ADULT_LOWER_RIGHT, ...FDI_ADULT_LOWER_LEFT];
                                    setSelectedTeeth(all);
                                  }}
                                  className="text-[9px] font-black text-indigo-650 hover:underline cursor-pointer border-0 outline-none bg-transparent"
                                >
                                  Select All
                                </button>
                                <span className="text-slate-300 text-[10px]">|</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedTeeth([])}
                                  className="text-[9px] font-black text-slate-500 hover:underline cursor-pointer border-0 outline-none bg-transparent"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-500 mb-3">
                              Patient age: <span className="font-bold text-slate-700">{getPatientAgeValue(selectedPatient?.age_dob)} years old</span>. Loaded <span className="font-bold text-indigo-600">{getPatientAgeValue(selectedPatient?.age_dob) <= 13 ? "Child (≤13 years)" : "Adult (>13 years)"}</span> dental chart.
                            </p>

                            <div className="flex flex-col gap-2.5">
                              
                              {/* Upper Jaws */}
                              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">Upper Jaw (Maxilla)</div>
                                <div className="grid grid-cols-2 gap-4">
                                  {/* Upper Right */}
                                  <div className="border-r border-dashed border-slate-200 pr-2">
                                    <span className="text-[8px] font-black text-slate-450 uppercase block mb-1">
                                      {getPatientAgeValue(selectedPatient?.age_dob) <= 13 ? "61–65 → Upper Right" : "18–11 Upper Right"}
                                    </span>
                                    <div className="flex flex-wrap gap-1 justify-end">
                                      {(getPatientAgeValue(selectedPatient?.age_dob) <= 13 ? FDI_CHILD_UPPER_RIGHT : FDI_ADULT_UPPER_RIGHT).map(t => {
                                        const active = selectedTeeth.includes(t);
                                        return (
                                          <button
                                            key={t}
                                            type="button"
                                            onClick={() => handleToggleTooth(t)}
                                            className={`w-6 h-7 text-[10px] font-mono font-bold rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                              active 
                                                ? 'bg-indigo-650 text-white border-indigo-750 shadow-xs'
                                                : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                                            }`}
                                          >
                                            {t}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Upper Left */}
                                  <div className="pl-2">
                                    <span className="text-[8px] font-black text-slate-450 uppercase block mb-1">
                                      {getPatientAgeValue(selectedPatient?.age_dob) <= 13 ? "51–55 → Upper Left" : "21–28 Upper Left"}
                                    </span>
                                    <div className="flex flex-wrap gap-1 justify-start">
                                      {(getPatientAgeValue(selectedPatient?.age_dob) <= 13 ? FDI_CHILD_UPPER_LEFT : FDI_ADULT_UPPER_LEFT).map(t => {
                                        const active = selectedTeeth.includes(t);
                                        return (
                                          <button
                                            key={t}
                                            type="button"
                                            onClick={() => handleToggleTooth(t)}
                                            className={`w-6 h-7 text-[10px] font-mono font-bold rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                              active 
                                                ? 'bg-indigo-650 text-white border-indigo-750 shadow-xs'
                                                : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
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

                              {/* Lower Jaws */}
                              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">Lower Jaw (Mandible)</div>
                                <div className="grid grid-cols-2 gap-4">
                                  {/* Lower Right */}
                                  <div className="border-r border-dashed border-slate-200 pr-2">
                                    <span className="text-[8px] font-black text-slate-450 uppercase block mb-1">
                                      {getPatientAgeValue(selectedPatient?.age_dob) <= 13 ? "81–85 → Lower Right" : "41–48 Lower Right"}
                                    </span>
                                    <div className="flex flex-wrap gap-1 justify-end">
                                      {(getPatientAgeValue(selectedPatient?.age_dob) <= 13 ? FDI_CHILD_LOWER_RIGHT : FDI_ADULT_LOWER_RIGHT).map(t => {
                                        const active = selectedTeeth.includes(t);
                                        return (
                                          <button
                                            key={t}
                                            type="button"
                                            onClick={() => handleToggleTooth(t)}
                                            className={`w-6 h-7 text-[10px] font-mono font-bold rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                              active 
                                                ? 'bg-indigo-650 text-white border-indigo-750 shadow-xs'
                                                : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                                            }`}
                                          >
                                            {t}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Lower Left */}
                                  <div className="pl-2">
                                    <span className="text-[8px] font-black text-slate-450 uppercase block mb-1">
                                      {getPatientAgeValue(selectedPatient?.age_dob) <= 13 ? "71–75 → Lower Left" : "31–38 Lower Left"}
                                    </span>
                                    <div className="flex flex-wrap gap-1 justify-start">
                                      {(getPatientAgeValue(selectedPatient?.age_dob) <= 13 ? FDI_CHILD_LOWER_LEFT : FDI_ADULT_LOWER_LEFT).map(t => {
                                        const active = selectedTeeth.includes(t);
                                        return (
                                          <button
                                            key={t}
                                            type="button"
                                            onClick={() => handleToggleTooth(t)}
                                            className={`w-6 h-7 text-[10px] font-mono font-bold rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                              active 
                                                ? 'bg-indigo-650 text-white border-indigo-750 shadow-xs'
                                                : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
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
                          </div>

                          {/* Inline calculations tracker */}
                          <div className="p-3 bg-indigo-50/25 rounded-xl border border-indigo-250 text-xs flex items-center justify-between font-medium">
                            <div>
                              <span className="block text-[9px] font-black text-indigo-700 uppercase">Interactive Estimate calculation</span>
                              <span className="font-mono text-slate-600 font-semibold text-[10.5px]">
                                Rate ₹{(selectedPredefinedId === 'custom' ? customTreatmentRate : SYSTEM_DENTAL_PROCEDURES.find(p => p.id === selectedPredefinedId)?.rate || 0).toLocaleString()} × Count {selectedTeeth.length} {selectedTeeth.length === 1 ? 'tooth' : 'teeth'}
                              </span>
                            </div>
                            <span className="text-xs font-black text-indigo-850 font-mono">
                              ₹{((selectedPredefinedId === 'custom' ? customTreatmentRate : SYSTEM_DENTAL_PROCEDURES.find(p => p.id === selectedPredefinedId)?.rate || 0) * selectedTeeth.length).toLocaleString()}
                            </span>
                          </div>

                          {/* Add to Draft list button */}
                          <button
                            type="button"
                            onClick={() => {
                              const currentSelectedRate = selectedPredefinedId === 'custom' ? customTreatmentRate : (SYSTEM_DENTAL_PROCEDURES.find(p => p.id === selectedPredefinedId)?.rate || 0);
                              const currentSelectedName = selectedPredefinedId === 'custom' ? customTreatmentName : (SYSTEM_DENTAL_PROCEDURES.find(p => p.id === selectedPredefinedId)?.name || '');
                              
                              if (!currentSelectedName.trim()) {
                                alert('Please provide a specific procedure title.');
                                return;
                              }
                              if (selectedTeeth.length === 0) {
                                alert('Please pick at least one tooth.');
                                return;
                              }

                              const isCustomVal = selectedPredefinedId === 'custom' || (SYSTEM_DENTAL_PROCEDURES.find(p => p.id === selectedPredefinedId)?.is_custom || false);

                              const designItem = {
                                s_no: builderTreatmentList.length + 1,
                                treatment_name: currentSelectedName,
                                is_custom: isCustomVal,
                                tooth_numbers: [...selectedTeeth],
                                rate: currentSelectedRate,
                                count: selectedTeeth.length,
                                estimate: currentSelectedRate * selectedTeeth.length
                              };

                              setBuilderTreatmentList(prev => [...prev, designItem].map((item, id) => ({ ...item, s_no: id + 1 })));
                              setSelectedTeeth([]);
                              setCustomTreatmentName('');
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer border-0 shadow-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Procedure with FDI selections
                          </button>
                        </div>

                        {/* List/Table preview of currently adding procedures */}
                        {builderTreatmentList.length > 0 && (
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs animate-fadeIn flex flex-col gap-3">
                            <h6 className="text-[10px] font-black uppercase text-indigo-650 tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-1">
                              📋 PLAN TABLE CONFLICT PREVIEW ({builderTreatmentList.length})
                            </h6>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[11px] font-sans border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-205 text-slate-450 uppercase font-bold text-[9px] tracking-wide">
                                    <th className="py-1.5 font-sans">S.No</th>
                                    <th className="py-1.5 font-sans">Treatment</th>
                                    <th className="py-1.5 font-sans text-center">Teeth</th>
                                    <th className="py-1.5 font-sans text-right">Estimate</th>
                                    <th className="py-1.5 font-sans text-center"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {builderTreatmentList.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-100 text-slate-800 font-medium">
                                      <td className="py-2 text-[10px] text-slate-450 font-mono">{item.s_no}</td>
                                      <td className="py-2 pr-1.5 font-semibold text-slate-800">
                                        {item.treatment_name}
                                        {item.is_custom && (
                                          <span className="block text-[8px] w-fit font-black bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200 uppercase mt-0.5">Custom</span>
                                        )}
                                      </td>
                                      <td className="py-2 text-center text-indigo-650 font-mono text-[10px]">{item.tooth_numbers.join(', ')}</td>
                                      <td className="py-2 text-right font-bold text-slate-800 font-mono">₹{item.estimate.toLocaleString()}</td>
                                      <td className="py-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveLineItem(index)}
                                          className="text-slate-400 hover:text-red-500 p-1.5 transition-colors cursor-pointer border-0 outline-none hover:bg-slate-50 rounded bg-transparent"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">GRAND ESTIMATE SUM:</span>
                              <span className="text-xs font-black text-indigo-850 font-mono">
                                ₹{builderTreatmentList.reduce((sum, item) => sum + item.estimate, 0).toLocaleString()}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={handleSaveBuilderPlan}
                              disabled={treatmentGenerating}
                              className="w-full mt-1.5 py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 outline-none"
                            >
                              <Send className="shrink-0 h-3 w-3 text-white" />
                              Apply & Share Plan to Case File
                            </button>

                            {successApplyMessage && (
                              <div className="mt-1 bg-emerald-50 text-emerald-800 border border-emerald-250 p-2 text-xs font-bold text-center rounded-xl">
                                {successApplyMessage}
                              </div>
                            )}

                          </div>
                        )}

                      </div>
                    ) : (
                      /* Traditional editor form */
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1 leading-none">
                            <Activity className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
                            Treatment notes
                          </label>
                          <span className="text-[9px] font-extrabold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200/55 uppercase font-mono">
                            PLAN COMPILES
                          </span>
                        </div>

                        {/* Presets pill tags */}
                        <div className="flex flex-col gap-1 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Clinical Presets (Quick Load):</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <button
                              type="button"
                              onClick={() => setTreatmentNotes("Patient requires Composite Filling on teeth 11, 12, and 21. Rate is 1500 per tooth. Also needs a Custom Treatment called Deep Laser Sterilization on tooth 46 priced at 3000.")}
                              className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[10px] text-slate-600 border border-slate-200 hover:border-indigo-200 font-semibold cursor-pointer transition-all"
                            >
                              Composite + Laser
                            </button>
                            <button
                              type="button"
                              onClick={() => setTreatmentNotes("Did scaling on 12, 13, 14 and advised RCT for 36 and 37 at 4000 per tooth.")}
                              className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[10px] text-slate-600 border border-slate-200 hover:border-indigo-200 font-semibold cursor-pointer transition-all"
                            >
                              Scaling & RCT Molar Plan
                            </button>
                            <button
                              type="button"
                              onClick={() => setTreatmentNotes("Patient needs Root Canal Treatment on teeth 14, 15 and Composite Filling on 13.")}
                              className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[10px] text-slate-600 border border-slate-200 hover:border-indigo-200 font-semibold cursor-pointer transition-all"
                            >
                              Missing Rates Check
                            </button>
                          </div>
                        </div>

                        {/* Text Box */}
                        <div className="relative">
                          <textarea
                            placeholder="Type clinic notes: e.g. Scaling on teeth 12, 13, and RCT for 36 priced at 3500."
                            value={treatmentNotes}
                            onChange={(e) => setTreatmentNotes(e.target.value)}
                            className="w-full h-24 p-3 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white outline-none font-sans leading-relaxed resize-none text-slate-800 shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={handleGenerateTreatmentPlan}
                            disabled={treatmentGenerating || !treatmentNotes.trim()}
                            className="mt-2 w-full bg-slate-950 hover:bg-slate-900 text-white py-2.5 px-4 rounded-xl text-xs font-bold font-sans transition-all flex items-center justify-center gap-1.5 disabled:bg-slate-100 disabled:text-slate-400 shadow-xs cursor-pointer border-0 outline-none hover:shadow-md"
                          >
                            {treatmentGenerating ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Compiling Dental Intelligence...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                                Generate Treatment Plan
                              </>
                            )}
                          </button>
                        </div>

                        {/* Success Response Alert */}
                        {successApplyMessage && (
                          <div className="mt-2 bg-emerald-50 text-emerald-800 border border-emerald-200/60 p-3 rounded-xl text-xs font-bold text-center animate-pulse">
                            {successApplyMessage}
                          </div>
                        )}

                        {/* Generated Output Preview Area */}
                        {generatedTreatmentMarkdown && (
                          <div className="mt-4 border-t border-slate-200 pt-3 flex flex-col gap-3">
                            
                            <div className="bg-white p-4 rounded-xl border border-indigo-150 shadow-sm overflow-x-auto">
                              <h6 className="text-[10px] font-black uppercase text-indigo-650 tracking-wider flex items-center gap-1 mb-2.5">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Generated breakdown preview
                              </h6>
                              <div className="text-xs text-slate-800 font-sans prose max-w-none prose-table:border prose-table:w-full prose-table:text-left markdown-body leading-relaxed">
                                <ReactMarkdown>{generatedTreatmentMarkdown}</ReactMarkdown>
                              </div>
                            </div>

                            {/* Collapsible telemetry block */}
                            <div className="bg-slate-900 rounded-xl overflow-hidden text-slate-300">
                              <button
                                type="button"
                                onClick={() => setShowDevPayload(!showDevPayload)}
                                className="w-full px-4 py-2.5 text-left text-[11px] font-mono hover:bg-slate-850 flex items-center justify-between border-0 text-slate-200 cursor-pointer outline-none bg-slate-900 leading-none"
                              >
                                <span className="flex items-center gap-1 text-[10px] text-zinc-300 uppercase tracking-tight">
                                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
                                  Developer export payload (json)
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase">{showDevPayload ? "Hide" : "Show"}</span>
                              </button>
                              
                              {showDevPayload && generatedTreatmentJson && (
                                <div className="p-3 bg-zinc-950 font-mono text-[10px] text-emerald-400 overflow-x-auto border-t border-slate-850 leading-relaxed max-h-48 whitespace-pre">
                                  <pre>{JSON.stringify(generatedTreatmentJson, null, 2)}</pre>
                                </div>
                              )}
                            </div>

                            {/* Save Trigger */}
                            <button
                              type="button"
                              onClick={handleApplyTreatmentPlan}
                              disabled={treatmentGenerating}
                              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 outline-none"
                            >
                              <Send className="h-3 w-3" />
                              Apply & Share Plan to Case File
                            </button>

                          </div>
                        )}

                      </div>
                    )}

                  </div>
                )}

              </div>

            </div>
          )}

          {/* AI OUTPUT DRAWER CONTAINER (Markdown clinical terminal render) */}
          {aiResponseMarkdown && (
            <div className="border-t-2 border-slate-200 bg-slate-900 text-slate-100 p-4 max-h-[350px] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">Dental Intelligence Engine Output</span>
                </div>
                <button 
                  onClick={() => setAiResponseMarkdown('')}
                  className="text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-800 transition-colors cursor-pointer"
                >
                  Clear Output
                </button>
              </div>

              {/* Rendered Markdown Body */}
              <div className="text-xs leading-relaxed text-slate-200 space-y-2 markdown-body font-sans select-text select-all">
                <ReactMarkdown>{aiResponseMarkdown}</ReactMarkdown>
              </div>
            </div>
          )}

        </div>

      </div>

          </>
        )}
      </main>

      {/* 5. AUDIT LOG REPORT (MD & METADATA STATE LAYER ACCORDION) */}
      <section id="senior-doctor-audit-trail" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          
          <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-base tracking-tight font-display flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                Senior Doctor Practice Audit Trail
              </h3>
              <p className="text-xs text-slate-450 font-medium">Total sequential logs, metadata state layers, and notification alerts</p>
            </div>
            
            <div className="text-[11px] font-mono bg-slate-805 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-300 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Synchronized Local CRM Database
            </div>
          </div>

          <div className="w-full">
            
            {/* Left: Complete Doctor Notifications Logs */}
            <div className="p-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                <span>🔔 HISTORICAL TRANSITION ALERTS</span>
                <span className="text-[10px] font-mono text-slate-400">{notifications.length} alerts saved</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className="p-3 bg-slate-50 text-slate-800 rounded-xl border border-slate-200/60 hover:bg-slate-100/50 transition-colors flex gap-2.5 items-start"
                  >
                    <div className="h-6 w-6 rounded bg-indigo-50 border border-indigo-100 text-indigo-650 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      MD
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 leading-none mb-1">
                        <span className="text-xs font-bold text-slate-900">{notif.patient_name}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-medium">{notif.timestamp}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className="text-[8px] font-semibold bg-indigo-100 text-indigo-900 px-1 py-0.2 rounded font-mono">
                          {notif.transitioned_to}
                        </span>
                        <span className="text-[8px] font-medium text-slate-405">
                          by {notif.action_by}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed italic border-l-2 border-indigo-200 pl-2">
                        {notif.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. ONBOARD PATIENT MANUAL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-850">
              <div>
                <h4 className="font-bold font-display text-sm flex items-center gap-1.5 text-slate-100">
                  <UserPlus className="h-4 w-4 text-indigo-400" />
                  {onboardingStep === 1 ? 'Register Patient Case' : 'Book In-Clinic Appointment'}
                </h4>
                <p className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase mt-0.5">
                  {onboardingStep === 1 ? 'Step 1 of 2: Demographics & Contact' : 'Step 2 of 2: Appointment Schematics'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setOnboardingStep(1);
                }}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-450 hover:text-white transition-colors"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="px-5 pt-4 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-indigo-600"></div>
              <div className={`flex-1 h-1.5 rounded-full transition-colors ${onboardingStep === 2 ? 'bg-indigo-600' : 'bg-slate-100'}`}></div>
            </div>

            <form onSubmit={handleManualOnboarding} className="p-5 space-y-4">
              
              {onboardingStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5">
                        Salutation <span className="text-red-500 font-bold">*</span>
                      </label>
                      <select
                        value={newSalutation}
                        onChange={(e) => setNewSalutation(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-800 transition-all font-sans font-semibold"
                      >
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Master">Master</option>
                      </select>
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5">
                          First Name <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newFirstName}
                          onChange={(e) => setNewFirstName(e.target.value)}
                          placeholder="Rahul"
                          className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-850 transition-all font-sans"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-455 uppercase tracking-widest block mb-1.5">
                          Last Name <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newLastName}
                          onChange={(e) => setNewLastName(e.target.value)}
                          placeholder="Verma"
                          className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-850 transition-all font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5">
                        Gender <span className="text-red-500 font-bold">*</span>
                      </label>
                      <select
                        value={newGender}
                        onChange={(e) => setNewGender(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-800 transition-all font-sans font-semibold"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5">
                        DoB (DD/MM/YYYY)
                      </label>
                      <input
                        type="text"
                        placeholder="24/11/1992"
                        value={newDob}
                        onChange={(e) => {
                          let val = e.target.value;
                          
                          // Format DoB input with slashes as user types
                          val = val.replace(/[^0-9/]/g, '');
                          const isDeleting = newDob.length > val.length;
                          if (!isDeleting) {
                            if (val.length === 2 && !val.includes('/')) {
                              val = val + '/';
                            } else if (val.length === 5 && val.split('/').length === 2 && val.charAt(4) !== '/') {
                              val = val + '/';
                            }
                          }
                          if (val.length > 10) {
                            val = val.slice(0, 10);
                          }
                          
                          setNewDob(val);
                          if (!val) {
                            setNewAge('');
                            return;
                          }
                          // Autocalculate age based on anchor 2026
                          const parts = val.split('/');
                          if (parts.length === 3) {
                            const yr = parseInt(parts[2], 10);
                            if (!isNaN(yr) && parts[2].length === 4) {
                              setNewAge((2026 - yr).toString());
                            }
                          }
                        }}
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-850 transition-all font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-455 uppercase tracking-widest block mb-1.5">
                        Age (Years) {!newDob && <span className="text-red-500 font-bold">*</span>}
                      </label>
                      <input
                        type="number"
                        disabled={!!newDob}
                        value={newAge}
                        onChange={(e) => setNewAge(e.target.value)}
                        placeholder={newDob ? "Derived" : "Enter age"}
                        className={`w-full text-xs p-2.5 border rounded-xl font-sans font-semibold transition-all ${
                          newDob 
                            ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" 
                            : "border-slate-250 bg-white text-slate-850 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5">
                        Mobile Number <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newMobile}
                        onChange={(e) => setNewMobile(e.target.value)}
                        placeholder="9876543210"
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-850 transition-all font-sans font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5">
                        Email ID
                      </label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="rahul.v@gmail.com"
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-850 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5">Onboarding clinical notes</label>
                    <textarea
                      value={newInitialNotes}
                      onChange={(e) => setNewInitialNotes(e.target.value)}
                      placeholder="Inquired about ceramic teeth whitening or orthodontic options..."
                      className="w-full text-xs p-3 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white h-20 resize-none text-slate-850 leading-relaxed font-sans transition-all"
                    />
                  </div>

                  <div className="flex gap-2.5 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      id="cta-onboard-next"
                      type="button"
                      onClick={() => {
                        if (!newFirstName || !newLastName) {
                          alert("First Name and Last Name are strictly mandatory.");
                          return;
                        }
                        if (!newDob && !newAge) {
                          alert("Please provide either DoB or Age.");
                          return;
                        }
                        if (!newMobile || newMobile.trim().length !== 10) {
                          alert("Mobile number is strictly mandatory and must be exactly 10 digits.");
                          return;
                        }
                        setOnboardingStep(2);
                      }}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer"
                    >
                      Book Appointment <ArrowRight className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200" id="onboarding-step-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5 animate-pulse">
                        Step 1: Clinical Speciality <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newSpeciality}
                        onChange={(e) => {
                          const spec = e.target.value;
                          setNewSpeciality(spec);
                          setNewDoctorName('');
                          setNewConsultationFees('0');
                        }}
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-800 transition-all font-sans font-semibold font-bold"
                      >
                        {SPECIALTIES.map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                          Step 2: Recommended Dentist <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setAddDocSpecialty(newSpeciality);
                            setShowAddDoctorModal(true);
                          }}
                          className="text-[10px] font-extrabold text-indigo-650 hover:text-indigo-800 underline uppercase cursor-pointer"
                        >
                          + Add Doctor
                        </button>
                      </div>
                      <select
                        value={newDoctorName}
                        onChange={(e) => {
                          const docName = e.target.value;
                          if (docName === 'ADD_NEW_DOCTOR') {
                            setAddDocSpecialty(newSpeciality);
                            setShowAddDoctorModal(true);
                            setNewDoctorName('');
                          } else {
                            setNewDoctorName(docName);
                            const matched = doctors.find(d => d.name === docName);
                            if (matched) {
                              setNewConsultationFees(String(matched.fees));
                            } else {
                              setNewConsultationFees('0');
                            }
                          }
                        }}
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-800 transition-all font-sans font-bold font-semibold"
                      >
                        <option value="">Select Doctor *</option>
                        {doctors.filter(d => d.specialty === newSpeciality).map(doc => (
                          <option key={doc.name} value={doc.name}>{doc.name}</option>
                        ))}
                        <option value="ADD_NEW_DOCTOR" className="text-indigo-600 font-bold bg-indigo-50">+ Add Doctor</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5">
                        Consultation Fees (₹) <span className="text-indigo-650 font-semibold">(Auto-Filled)</span>
                      </label>
                      <input
                        type="number"
                        value={newConsultationFees}
                        onChange={(e) => setNewConsultationFees(e.target.value)}
                        placeholder="500"
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50 text-slate-850 transition-all font-sans font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-455 uppercase tracking-widest block mb-1.5 font-sans">
                        Booking Type
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setNewBookingType('Walk-in')}
                          className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            newBookingType === 'Walk-in'
                              ? 'bg-indigo-650 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          🟢 Walk-in Queue
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewBookingType('Online')}
                          className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            newBookingType === 'Online'
                              ? 'bg-indigo-650 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          🕒 Online Slot
                        </button>
                      </div>
                      <div className="mt-2 text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <span>Selected:</span>
                        <span className="text-indigo-650 font-extrabold bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                          {newBookingType === 'Walk-in' ? 'Walk-in Queue' : 'Online Slot'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Booking Type Branching Output */}
                  {newBookingType === 'Walk-in' ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl text-slate-800 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Queue Management Triggered
                      </div>
                      <p className="text-[11px] text-emerald-700/90 font-medium">
                        Patient will be routed instantly: <strong className="bg-emerald-100/60 px-1 py-0.5 rounded text-emerald-900">[ACTION]: Direct Add to Active OPD Live Queue</strong>. No timeslot booking required!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-indigo-650 uppercase tracking-widest block">
                        🕒 Select Available Timeslot Grid:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM'].map((slotStr) => {
                          const isSel = newAppointmentSlot === slotStr;
                          return (
                            <button
                              key={slotStr}
                              type="button"
                              onClick={() => setNewAppointmentSlot(slotStr)}
                              className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all text-center cursor-pointer ${
                                isSel
                                  ? 'bg-indigo-650 text-white border-indigo-650 scale-[1.02]'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {slotStr}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5">
                        Patient Category
                      </label>
                      <select
                        value={newPatientCategory}
                        onChange={(e) => setNewPatientCategory(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-800 transition-all font-sans font-semibold"
                      >
                        <option value="General">General</option>
                        <option value="VIP">VIP</option>
                        <option value="Corporate Partner">Corporate Partner</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5">
                        Case Type
                      </label>
                      <select
                        value={newCaseType}
                        onChange={(e) => setNewCaseType(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-800 transition-all font-sans font-semibold"
                      >
                        <option value="New Consultation">New Consultation</option>
                        <option value="Review">Review</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Emergency">Emergency</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5">
                        Appointment Date
                      </label>
                      <input
                        type="date"
                        required
                        value={newAppointmentDate}
                        onChange={(e) => setNewAppointmentDate(e.target.value)}
                        className="w-full text-[11px] p-2 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-850 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5">
                    <span className="text-lg">🏢</span>
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Fixed Appointment Type</p>
                      <p className="text-slate-550 leading-relaxed mt-0.5">This schedule routes as an <strong>In-Clinic Appointment</strong> directly under CRM guidelines.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setOnboardingStep(1)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      ← Back to Profile
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          setOnboardingStep(1);
                        }}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer"
                      >
                        Confirm Registry & Book <ArrowRight className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* 🗔 SIMULATED "+ ADD DOCTOR" POP-UP DIALOG */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗔</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Add New Doctor Profile</h3>
                  <p className="text-[10px] text-slate-400">Simulation of a secure secondary master registry onboarding form</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDoctorModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewDoctor} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Amit Sharma"
                    value={addDocName}
                    onChange={(e) => setAddDocName(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Clinical Speciality <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addDocSpecialty}
                    onChange={(e) => setAddDocSpecialty(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-800 font-bold"
                  >
                    {SPECIALTIES.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Phone No. (10-Digit) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={addDocPhone}
                    onChange={(e) => setAddDocPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-800 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Email Id <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@clinic.com"
                    value={addDocEmail}
                    onChange={(e) => setAddDocEmail(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Med. Registration Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Alphanumeric unique (e.g. DC-12345)"
                    value={addDocMedReg}
                    onChange={(e) => setAddDocMedReg(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Qualifications <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BDS, MDS Orthodontics"
                    value={addDocQualifications}
                    onChange={(e) => setAddDocQualifications(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-2">
                  Select Hospital (Multi-Selection Enabled Clinic Branches) <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    "BTM",
                    "Koramangala",
                    "ECity",
                    "Konankunte",
                    "Uttarahalli"
                  ].map(branch => {
                    const isSelected = addDocSelectedHospitals.includes(branch);
                    return (
                      <label key={branch} className="flex items-center gap-2.5 text-xs text-slate-700 font-sans font-semibold py-1 px-1.5 hover:bg-slate-100 rounded-lg transition-all cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAddDocSelectedHospitals(prev => [...prev, branch]);
                            } else {
                              setAddDocSelectedHospitals(prev => prev.filter(b => b !== branch));
                            }
                          }}
                          className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                        />
                        <span>{branch}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1"
                >
                  Save Doctor Profile <CheckCircle className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
