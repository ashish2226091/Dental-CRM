import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { Patient, PatientStage, DoctorNotification, TreatmentPlan } from './src/types';
import { db } from './src/db/index.ts';
import * as schema from './src/db/schema.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}



const DEFAULT_SEED_PATIENTS: Patient[] = [
  {
    patient_id: "OPD_0255",
    salutation: "Mr.",
    first_name: "Ashish",
    last_name: "Kumar",
    gender: "Male",
    age_dob: "25 years old",
    age_calculated: 25,
    mobile: "7777939935",
    category: "VIP",
    last_visit: "07-04-2026",
    current_stage: "STAGE_4: TREATMENT_ACCEPTED",
    history: [
      "Logged by Receptionist | Patient Ashish Kumar registered with VIP category.",
      "Logged by Coordinator | Case sheet loaded: Root Canal Treatment proposed.",
      "Logged by Dentist | Treatment ACCEPTED. Patient chose Clinic EMI scheme."
    ],
    financials: {
      total_cost: 16000,
      payment_mode: "Clinic EMI",
      payment_status: "Active EMI",
      emi_months: 6,
      emi_monthly_amount: 2667
    },
    active_treatment_plans: [
      {
        plan_id: "plan_9022",
        plan_name: "Root Canal + Zirconia Crown Combo Plan",
        status: "Treatment in Progress",
        billing_items: [
          {
            tooth_no: [46],
            procedure_name: "Root Canal Treatment (RCT)",
            base_rate: 4000,
            count: 1,
            discount_percent: 0,
            gst_percent: 18,
            final_total: 4720
          },
          {
            tooth_no: [46],
            procedure_name: "Crown/Cap",
            base_rate: 5000,
            count: 1,
            discount_percent: 10,
            gst_percent: 18,
            final_total: 5310
          },
          {
            tooth_no: [14, 15],
            procedure_name: "Composite Filling",
            base_rate: 1500,
            count: 2,
            discount_percent: 10,
            gst_percent: 18,
            final_total: 3186
          }
        ],
        visit_logs: [
          {
            visit_id: "visit_4011",
            visit_number: "V1",
            date: "12-04-2026",
            procedure_step: "Access Opening",
            assigned_teeth: [46],
            conducted_by: "Dr. Sarah Jenkins",
            assisted_by: "Nurse Clara",
            remarks: "Pulpectomy done, temporary dressing applied."
          }
        ]
      }
    ]
  },
  {
    patient_id: "OPD_1048",
    salutation: "Mrs.",
    first_name: "Priya",
    last_name: "Sharma",
    gender: "Female",
    age_dob: "45 years old",
    age_calculated: 45,
    mobile: "9876543219",
    category: "Diabetic",
    last_visit: "10-05-2026",
    current_stage: "STAGE_5: PAYMENT_COMPLETED",
    history: [
      "Logged by Coordinator | Custom full mouth scaling and polishing done.",
      "Logged by Accountant | Cash payment collected: Fully Paid."
    ],
    financials: {
      total_cost: 1000,
      payment_mode: "Cash",
      payment_status: "Fully Paid",
      emi_months: 0,
      emi_monthly_amount: 0
    },
    active_treatment_plans: [
      {
        plan_id: "plan_3045",
        plan_name: "Scaling Polishing Plan",
        status: "Treatment Done",
        billing_items: [
          {
            tooth_no: [11, 12, 21, 22],
            procedure_name: "Scaling & Polishing",
            base_rate: 1000,
            count: 1,
            discount_percent: 0,
            gst_percent: 0,
            final_total: 1000
          }
        ],
        visit_logs: []
      }
    ]
  }
];

// In-memory persistent database for the CRM session (keeps working instantly and cloud-syncs)
let patients: Patient[] = [...DEFAULT_SEED_PATIENTS];

let notifications: DoctorNotification[] = [];

interface DoctorRegistryItem {
  name: string;
  specialty: string;
  fees: number;
  phone?: string;
  email?: string;
  med_reg?: string;
  qualifications?: string;
  hospitals?: string[];
}

let doctorRegistry: DoctorRegistryItem[] = [
  { name: "Dr. Amit Sharma", specialty: "General Dentistry", fees: 500, phone: "9876543210", email: "amit@clinic.com", med_reg: "DC-12345", qualifications: "BDS, MDS", hospitals: ["BTM"] },
  { name: "Dr. Priya Nair", specialty: "Orthodontics", fees: 1500, phone: "9988776655", email: "priya@clinic.com", med_reg: "DC-67890", qualifications: "MDS Orthodontics", hospitals: ["Koramangala"] },
  { name: "Dr. Rohan Das", specialty: "Endodontics", fees: 1200, phone: "9812345678", email: "rohan@clinic.com", med_reg: "DC-54321", qualifications: "MDS Endodontics", hospitals: ["ECity"] }
];

async function loadDataFromFirestore() {
  try {
    // 1. Load patients
    const dbPatients = await db.select().from(schema.patients);
    if (dbPatients.length > 0) {
      patients = dbPatients.map(p => ({
        patient_id: p.patient_id,
        first_name: p.first_name,
        last_name: p.last_name,
        gender: p.gender,
        age_dob: p.age_dob,
        current_stage: p.current_stage as PatientStage,
        history: p.history,
        financials: p.financials,
        salutation: p.salutation ?? undefined,
        mobile: p.mobile ?? undefined,
        email: p.email ?? undefined,
        dob: p.dob ?? undefined,
        age_calculated: p.age_calculated ?? undefined,
        treatment_plan_markdown: p.treatment_plan_markdown ?? undefined,
        treatment_plan_json: p.treatment_plan_json ?? undefined,
        active_treatment_plans: (p.active_treatment_plans as any) ?? undefined,
        selected_payment_mode: p.selected_payment_mode ?? undefined,
        category: p.category ?? undefined,
        last_visit: p.last_visit ?? undefined,
        appointment_booking: (p.appointment_booking as any) ?? undefined,
      }));
      console.log(`Loaded ${patients.length} patients from SQL database.`);
    } else {
      // Seed default patients
      for (const p of DEFAULT_SEED_PATIENTS) {
        await db.insert(schema.patients).values({
          patient_id: p.patient_id,
          salutation: p.salutation ?? null,
          first_name: p.first_name,
          last_name: p.last_name,
          gender: p.gender,
          mobile: p.mobile ?? null,
          email: p.email ?? null,
          dob: p.dob ?? null,
          age_calculated: p.age_calculated ?? null,
          age_dob: p.age_dob,
          current_stage: p.current_stage,
          history: p.history,
          financials: p.financials,
          treatment_plan_markdown: p.treatment_plan_markdown ?? null,
          treatment_plan_json: p.treatment_plan_json ?? null,
          active_treatment_plans: p.active_treatment_plans ?? null,
          selected_payment_mode: p.selected_payment_mode ?? null,
          category: p.category ?? null,
          last_visit: p.last_visit ?? null,
          appointment_booking: p.appointment_booking ?? null,
        });
      }
      patients = [...DEFAULT_SEED_PATIENTS];
      console.log('Seeded default patients into empty SQL Database.');
    }

    // 2. Load doctors
    const dbDoctors = await db.select().from(schema.doctors);
    if (dbDoctors.length > 0) {
      doctorRegistry = dbDoctors.map(d => ({
        name: d.name,
        specialty: d.specialty,
        fees: d.fees,
        phone: d.phone ?? undefined,
        email: d.email ?? undefined,
        med_reg: d.med_reg ?? undefined,
        qualifications: d.qualifications ?? undefined,
        hospitals: d.hospitals as string[] ?? undefined,
      }));
      console.log(`Loaded ${doctorRegistry.length} doctors from SQL database.`);
    } else {
      for (const d of doctorRegistry) {
        const id = d.name.replace(/\s+/g, '_').toLowerCase();
        await db.insert(schema.doctors).values({
          id,
          name: d.name,
          specialty: d.specialty,
          fees: d.fees,
          phone: d.phone ?? null,
          email: d.email ?? null,
          med_reg: d.med_reg ?? null,
          qualifications: d.qualifications ?? null,
          hospitals: d.hospitals ?? null,
        });
      }
      console.log('Seeded initial doctors into SQL database.');
    }

    // 3. Load notifications
    const dbNotifications = await db.select().from(schema.notifications);
    if (dbNotifications.length > 0) {
      notifications = dbNotifications.map(n => ({
        id: n.id,
        timestamp: n.timestamp,
        patient_name: n.patient_name,
        transitioned_to: n.transitioned_to,
        action_by: n.action_by,
        summary: n.summary,
      }));
      notifications.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      console.log(`Loaded ${notifications.length} notifications from SQL database.`);
    }

    // 4. Load/Seed registered users to the SQL DB
    const dbUsers = await db.select().from(schema.users);
    if (dbUsers.length > 0) {
      registeredUsers = dbUsers.map(u => ({
        email: u.email,
        mobile_no: u.mobileNo ?? '',
        first_name: u.firstName ?? '',
        last_name: u.lastName ?? '',
        gender: u.gender ?? '',
        age_dob: u.ageDob ?? '',
        type: (u.type as 'doctor' | 'staff') ?? 'staff',
      }));
      console.log(`Loaded ${registeredUsers.length} users from SQL database.`);
    } else {
      for (const u of registeredUsers) {
        await db.insert(schema.users).values({
          id: u.email.toLowerCase(),
          email: u.email.toLowerCase(),
          mobileNo: u.mobile_no,
          firstName: u.first_name,
          lastName: u.last_name,
          gender: u.gender,
          ageDob: u.age_dob,
          type: u.type,
        });
      }
      console.log('Seeded initial users into SQL database.');
    }
  } catch (error) {
    console.error('Error loading data from SQL Database:', error);
  }
}

async function savePatientToFirestore(patient: Patient) {
  try {
    const values = {
      patient_id: patient.patient_id,
      salutation: patient.salutation ?? null,
      first_name: patient.first_name,
      last_name: patient.last_name,
      gender: patient.gender,
      mobile: patient.mobile ?? null,
      email: patient.email ?? null,
      dob: patient.dob ?? null,
      age_calculated: patient.age_calculated ?? null,
      age_dob: patient.age_dob,
      current_stage: patient.current_stage,
      history: patient.history,
      financials: patient.financials,
      treatment_plan_markdown: patient.treatment_plan_markdown ?? null,
      treatment_plan_json: patient.treatment_plan_json ?? null,
      active_treatment_plans: patient.active_treatment_plans ?? null,
      selected_payment_mode: patient.selected_payment_mode ?? null,
      category: patient.category ?? null,
      last_visit: patient.last_visit ?? null,
      appointment_booking: patient.appointment_booking ?? null,
    };

    await db.insert(schema.patients)
      .values(values)
      .onConflictDoUpdate({
        target: schema.patients.patient_id,
        set: values,
      });

    console.log(`Saved patient ${patient.patient_id} to SQL Database.`);
  } catch (error) {
    console.error(`Database save error for patient ${patient.patient_id}:`, error);
  }
}

async function saveDoctorToFirestore(doctor: DoctorRegistryItem) {
  try {
    const id = doctor.name.replace(/\s+/g, '_').toLowerCase();
    const values = {
      id,
      name: doctor.name,
      specialty: doctor.specialty,
      fees: doctor.fees,
      phone: doctor.phone ?? null,
      email: doctor.email ?? null,
      med_reg: doctor.med_reg ?? null,
      qualifications: doctor.qualifications ?? null,
      hospitals: doctor.hospitals ?? null,
    };

    await db.insert(schema.doctors)
      .values(values)
      .onConflictDoUpdate({
        target: schema.doctors.id,
        set: values,
      });

    console.log(`Saved doctor ${doctor.name} to SQL Database.`);
  } catch (error) {
    console.error(`Database save error for doctor ${doctor.name}:`, error);
  }
}

async function saveNotificationToFirestore(notif: DoctorNotification) {
  try {
    const values = {
      id: notif.id,
      timestamp: notif.timestamp,
      patient_name: notif.patient_name,
      transitioned_to: notif.transitioned_to,
      action_by: notif.action_by,
      summary: notif.summary,
    };

    await db.insert(schema.notifications)
      .values(values)
      .onConflictDoUpdate({
        target: schema.notifications.id,
        set: values,
      });

    console.log(`Saved notification ${notif.id} to SQL Database.`);
  } catch (error) {
    console.error(`Database save error for notification ${notif.id}:`, error);
  }
}

async function resetFirestoreCollections() {
  try {
    await db.delete(schema.patients);
    await db.delete(schema.notifications);
    console.log('Reset patients and notifications collections in SQL Database.');
  } catch (error) {
    console.error('Database delete error in reset:', error);
  }
}

// Automatically load database on startup
loadDataFromFirestore().catch(err => console.error("Error running initial DB load:", err));

// Helper to calculate a unique patient ID
function generateId(): string {
  return 'patient_' + Math.floor(1000 + Math.random() * 9000);
}


// --------------------------------------------------------------------------
// REST APIs for patients & notifications
// --------------------------------------------------------------------------

// Fetch all patients
app.get('/api/patients', (req: Request, res: Response) => {
  res.json({ patients });
});

// Fetch a single patient dossier complete with their treatment parameters and chronological log
app.get('/api/patients/:id', (req: Request, res: Response) => {
  const patient = patients.find(p => p.patient_id === req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  res.json({ patient });
});

// Fetch all doctors in the registry (supports query parameter specialty filtering)
app.get('/api/doctors', (req: Request, res: Response) => {
  const { specialty } = req.query;
  if (specialty) {
    const list = doctorRegistry.filter(d => d.specialty.toLowerCase() === String(specialty).trim().toLowerCase());
    return res.json({ doctors: list });
  }
  // If the query is specifically empty/null, default to empty or full list as requested
  if (req.query.specialty === "") {
    return res.json({ doctors: [] });
  }
  res.json({ doctors: doctorRegistry });
});

// Add/update doctor in registry
app.post('/api/doctors', (req: Request, res: Response) => {
  const { name, specialty, fees, phone, email, med_reg, qualifications, hospitals } = req.body;
  if (!name || !specialty) {
    return res.status(400).json({ error: 'Name and specialty are required.' });
  }
  const fValue = Number(fees) || 500;
  const existing = doctorRegistry.find(d => d.name.toLowerCase() === name.toLowerCase());
  let targetDoc: DoctorRegistryItem;
  if (existing) {
    existing.specialty = specialty;
    existing.fees = fValue;
    if (phone) existing.phone = phone;
    if (email) existing.email = email;
    if (med_reg) existing.med_reg = med_reg;
    if (qualifications) existing.qualifications = qualifications;
    if (hospitals) existing.hospitals = hospitals;
    targetDoc = existing;
  } else {
    targetDoc = {
      name,
      specialty,
      fees: fValue,
      phone,
      email,
      med_reg,
      qualifications,
      hospitals
    };
    doctorRegistry.push(targetDoc);
  }
  saveDoctorToFirestore(targetDoc).catch(err => console.error(err));
  res.json({ success: true, doctors: doctorRegistry });
});

// Reset CRM store back to standard seeds
app.post('/api/patients/reset', async (req: Request, res: Response) => {
  patients = [...DEFAULT_SEED_PATIENTS];
  notifications = [];
  try {
    await resetFirestoreCollections();
    for (const p of DEFAULT_SEED_PATIENTS) {
      await savePatientToFirestore(p);
    }
  } catch (err) {
    console.error("Error seeding during reset: ", err);
  }
  res.json({ success: true, patients, notifications });
});

// Fetch senior doctor notifications
app.get('/api/notifications', (req: Request, res: Response) => {
  res.json({ notifications });
});

// 📥 POST /api/treatments/:patientId/plan - Create a custom treatment arrangement, calculate financial equations, and transition stage
app.post('/api/treatments/:patientId/plan', (req: Request, res: Response) => {
  const { patientId } = req.params;
  const { paymentMode, billingItems, emiMonths, planName } = req.body;

  const patient = patients.find(p => p.patient_id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  if (!billingItems || !Array.isArray(billingItems)) {
    return res.status(400).json({ error: 'billingItems array is required' });
  }

  let grandTotal = 0;
  const processedItems = billingItems.map(item => {
    const toothNo = item.toothNumbers || item.tooth_no || [];
    const count = toothNo.length || 1;
    const baseRate = Number(item.baseRate || item.base_rate) || 0;
    const discountPercent = Number(item.discountPercent || item.discount_percent) || 0;
    const gstPercent = Number(item.gstPercent || item.gst_percent) || 0;

    // Formulas:
    // Gross = BaseRate * Count
    // Discounted = Gross - (Gross * DiscountPercent / 100)
    // FinalTotal = Discounted + (Discounted * GSTPercent / 100)
    const gross = baseRate * count;
    const discounted = gross - (gross * discountPercent / 100);
    const finalTotal = Math.round(discounted + (discounted * gstPercent / 100));

    grandTotal += finalTotal;

    return {
      tooth_no: toothNo,
      procedure_name: item.procedureName || item.procedure_name || 'Dental Procedure',
      base_rate: baseRate,
      count,
      discount_percent: discountPercent,
      gst_percent: gstPercent,
      final_total: finalTotal
    };
  });

  const planId = 'plan_' + Math.floor(1000 + Math.random() * 9000);
  const paymentModeVal = paymentMode || 'Cash';
  const months = Number(emiMonths) || 0;
  const emiAmount = (paymentModeVal === 'EMI' || paymentModeVal === 'Clinic EMI') && months > 0 
    ? Math.round(grandTotal / months) 
    : 0;

  const newPlan: TreatmentPlan = {
    plan_id: planId,
    plan_name: planName || 'Comprehensive Treatment Plan',
    status: 'Treatment in Progress' as 'Treatment in Progress' | 'Treatment Done',
    billing_items: processedItems,
    visit_logs: []
  };

  if (!patient.active_treatment_plans) {
    patient.active_treatment_plans = [];
  }
  patient.active_treatment_plans.push(newPlan);

  // Update patient metrics
  patient.current_stage = 'STAGE_4: TREATMENT_ACCEPTED';
  patient.financials = {
    total_cost: grandTotal,
    payment_mode: paymentModeVal,
    payment_status: (paymentModeVal === 'EMI' || paymentModeVal === 'Clinic EMI') ? 'Active EMI' : 'Pending',
    emi_months: months,
    emi_monthly_amount: emiAmount
  };
  patient.selected_payment_mode = paymentModeVal;

  patient.history.push(`Logged by Dentist | Active treatment plan ${newPlan.plan_name} created. Payment mode locked to ${paymentModeVal}. Total value: ₹${grandTotal.toLocaleString()}`);

  const notif = {
    id: 'notif_' + Math.floor(1000 + Math.random() * 9000),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    patient_name: `${patient.first_name} ${patient.last_name}`,
    transitioned_to: patient.current_stage,
    action_by: 'Dentist',
    summary: `Created and locked treatment plan worth ₹${grandTotal.toLocaleString()} on ${paymentModeVal}.`
  };
  notifications.unshift(notif);

  savePatientToFirestore(patient).catch(err => console.error(err));
  saveNotificationToFirestore(notif).catch(err => console.error(err));

  res.json({ success: true, patient, plan: newPlan });
});

// 📥 POST /api/treatments/:patientId/visit - Log an ongoing treatment visit row
app.post('/api/treatments/:patientId/visit', (req: Request, res: Response) => {
  const { patientId } = req.params;
  const { procedureStep, assignedTeeth, conductedBy, assistedBy, remarks, planId } = req.body;

  const patient = patients.find(p => p.patient_id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  if (!procedureStep) {
    return res.status(400).json({ error: 'procedureStep is required' });
  }

  let targetPlan = patient.active_treatment_plans?.find(pl => pl.status === 'Treatment in Progress');
  if (planId && patient.active_treatment_plans) {
    targetPlan = patient.active_treatment_plans.find(pl => pl.plan_id === planId) || targetPlan;
  }

  if (!targetPlan) {
    return res.status(400).json({ error: 'No active treatment plan in progress found.' });
  }

  const visitNumber = (targetPlan.visit_logs?.length || 0) + 1;
  const newVisit = {
    visit_id: 'visit_' + Math.floor(1000 + Math.random() * 9000),
    visit_number: `V${visitNumber}`,
    date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
    procedure_step: procedureStep,
    assigned_teeth: assignedTeeth || [],
    conducted_by: conductedBy || 'Dr. Sarah Jenkins',
    assisted_by: assistedBy || 'Nurse Clara',
    remarks: remarks || ''
  };

  if (!targetPlan.visit_logs) {
    targetPlan.visit_logs = [];
  }
  targetPlan.visit_logs.push(newVisit);

  const clinicalMsg = `Logged by clinical staff | Visit V${visitNumber} logged: ${procedureStep} on teeth [${newVisit.assigned_teeth.join(', ')}] by ${newVisit.conducted_by}. Remarks: "${newVisit.remarks}"`;
  patient.history.push(clinicalMsg);

  const notif = {
    id: 'notif_' + Math.floor(1000 + Math.random() * 9000),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    patient_name: `${patient.first_name} ${patient.last_name}`,
    transitioned_to: patient.current_stage,
    action_by: conductedBy || 'Dentist',
    summary: `Conducted clinical visit step: ${procedureStep} for ${patient.first_name}.`
  };
  notifications.unshift(notif);

  savePatientToFirestore(patient).catch(err => console.error(err));
  saveNotificationToFirestore(notif).catch(err => console.error(err));

  res.json({ success: true, patient, visit: newVisit });
});

// 📥 POST /api/treatments/:patientId/finish - Flags treatment done and compiles parameters for Print Preview
app.post('/api/treatments/:patientId/finish', (req: Request, res: Response) => {
  const { patientId } = req.params;
  const { planId } = req.body;

  const patient = patients.find(p => p.patient_id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  let targetPlan = patient.active_treatment_plans?.find(pl => pl.status === 'Treatment in Progress');
  if (planId && patient.active_treatment_plans) {
    targetPlan = patient.active_treatment_plans.find(pl => pl.plan_id === planId) || targetPlan;
  }

  if (!targetPlan) {
    return res.status(400).json({ error: 'No active treatment plan found to finish.' });
  }

  targetPlan.status = 'Treatment Done';
  patient.current_stage = 'STAGE_6_CLOSED';
  
  if (patient.financials) {
    patient.financials.payment_status = 'Fully Paid';
  }

  patient.history.push(`Logged by Dentist | Treatment course successfully completed and marked as Done. Exported data for printable receipts.`);

  const notif = {
    id: 'notif_' + Math.floor(1000 + Math.random() * 9000),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    patient_name: `${patient.first_name} ${patient.last_name}`,
    transitioned_to: 'STAGE_6_CLOSED',
    action_by: 'Practice Dentist',
    summary: `Completed and successfully closed treatment case for ${patient.first_name} ${patient.last_name}.`
  };
  notifications.unshift(notif);

  savePatientToFirestore(patient).catch(err => console.error(err));
  saveNotificationToFirestore(notif).catch(err => console.error(err));

  res.json({
    success: true,
    patient,
    print_payload: {
      patient_details: {
        id: patient.patient_id,
        name: `${patient.salutation || ''} ${patient.first_name} ${patient.last_name}`.trim(),
        gender: patient.gender,
        age: patient.age_calculated,
        mobile: patient.mobile
      },
      plan_details: {
        plan_id: targetPlan.plan_id,
        plan_name: targetPlan.plan_name,
        status: targetPlan.status,
        billing_items: targetPlan.billing_items,
        visit_logs: targetPlan.visit_logs
      },
      financial_summary: {
        payment_mode: patient.financials.payment_mode,
        payment_status: patient.financials.payment_status,
        total_cost: patient.financials.total_cost,
        emi_months: patient.financials.emi_months,
        emi_monthly_amount: patient.financials.emi_monthly_amount
      },
      compiled_timestamp: new Date().toISOString()
    }
  });
});

// 📥 GET /api/billing/dashboard - Computes summary analytics of OPD Billing metrics
app.get('/api/billing/dashboard', (req: Request, res: Response) => {
  let totalEstCaseValue = 0;
  let realizedIncome = 0;
  let deferredEMIBookValue = 0;
  let overdueBalance = 0;

  for (const p of patients) {
    const cost = p.financials?.total_cost || 0;
    const mode = p.financials?.payment_mode || '';
    const status = p.financials?.payment_status || '';
    const emiMonths = p.financials?.emi_months || 0;
    const emiAmount = p.financials?.emi_monthly_amount || 0;

    totalEstCaseValue += cost;

    if (status === 'Fully Paid' || status === 'STAGE_5: PAYMENT_COMPLETED') {
      realizedIncome += cost;
    } else if (mode === 'EMI' || mode === 'Clinic EMI' || mode === 'Clinic_EMI') {
      const upfront = Math.round(cost * 0.25); // 25% downpayment
      const month1Installment = emiAmount || Math.round((cost - upfront) / (emiMonths || 1));
      const realized = upfront + month1Installment;
      
      realizedIncome += realized;
      deferredEMIBookValue += Math.max(0, cost - realized);
    } else if (status.toLowerCase().includes('pending') || status.toLowerCase().includes('unpaid')) {
      overdueBalance += cost;
    } else {
      realizedIncome += cost;
    }
  }

  res.json({
    success: true,
    metrics: {
      totalEstCaseValue,
      realizedIncome,
      deferredEMIBookValue,
      overdueBalance
    }
  });
});

// Exact copy on general endpoint to fully satisfy routing fallback
app.get('/api/dashboard', (req: Request, res: Response) => {
  let totalEstCaseValue = 0;
  let realizedIncome = 0;
  let deferredEMIBookValue = 0;
  let overdueBalance = 0;

  for (const p of patients) {
    const cost = p.financials?.total_cost || 0;
    const mode = p.financials?.payment_mode || '';
    const status = p.financials?.payment_status || '';
    const emiMonths = p.financials?.emi_months || 0;
    const emiAmount = p.financials?.emi_monthly_amount || 0;

    totalEstCaseValue += cost;

    if (status === 'Fully Paid' || status === 'STAGE_5: PAYMENT_COMPLETED') {
      realizedIncome += cost;
    } else if (mode === 'EMI' || mode === 'Clinic EMI' || mode === 'Clinic_EMI') {
      const upfront = Math.round(cost * 0.25);
      const month1Installment = emiAmount || Math.round((cost - upfront) / (emiMonths || 1));
      const realized = upfront + month1Installment;
      
      realizedIncome += realized;
      deferredEMIBookValue += Math.max(0, cost - realized);
    } else if (status.toLowerCase().includes('pending') || status.toLowerCase().includes('unpaid')) {
      overdueBalance += cost;
    } else {
      realizedIncome += cost;
    }
  }

  res.json({
    success: true,
    metrics: {
      totalEstCaseValue,
      realizedIncome,
      deferredEMIBookValue,
      overdueBalance
    }
  });
});

// Create a patient manually (standard fallback if needed)
app.post('/api/patients', (req: Request, res: Response) => {
  const patientData = req.body;

  // Interlock Rule: If Date of Birth (DoB) is filled, instantly disable manual Age field
  // and auto-calculate age based on year 2026.
  let ageCalculated = Number(patientData.age_calculated) || 0;
  let ageDob = patientData.age_dob || 'N/A';

  if (patientData.dob && String(patientData.dob).trim()) {
    const dobStr = String(patientData.dob).trim();
    let birthYear: number | null = null;
    
    const partsSlash = dobStr.split('/');
    if (partsSlash.length === 3) {
      birthYear = parseInt(partsSlash[2], 10);
    } else {
      const partsHyphen = dobStr.split('-');
      if (partsHyphen.length === 3) {
        if (partsHyphen[0].length === 4) {
          birthYear = parseInt(partsHyphen[0], 10);
        } else {
          birthYear = parseInt(partsHyphen[2], 10);
        }
      }
    }
    
    if (!birthYear || isNaN(birthYear)) {
      const parsedDate = new Date(dobStr);
      if (!isNaN(parsedDate.getTime())) {
        birthYear = parsedDate.getFullYear();
      }
    }

    if (birthYear && !isNaN(birthYear) && birthYear > 1900 && birthYear <= 2026) {
      ageCalculated = 2026 - birthYear;
      ageDob = `${ageCalculated} years old`;
    }
  }

  const newPatient: Patient = {
    patient_id: patientData.patient_id || generateId(),
    salutation: patientData.salutation || 'Mr.',
    first_name: patientData.first_name || 'Generic',
    last_name: patientData.last_name || 'Patient',
    gender: patientData.gender || 'Not Specified',
    mobile: patientData.mobile || '',
    email: patientData.email || '',
    dob: patientData.dob || '',
    age_calculated: ageCalculated,
    age_dob: ageDob,
    current_stage: patientData.current_stage || 'STAGE_1: FOLLOW_UP',
    history: patientData.history || [`Logged by Clinic Clerk | Patient profile onboarded manually.`],
    financials: {
      total_cost: Number(patientData.financials?.total_cost) || 0,
      payment_mode: patientData.financials?.payment_mode || 'Not Selected',
      payment_status: patientData.financials?.payment_status || 'Pending',
      emi_months: Number(patientData.financials?.emi_months) || 0,
      emi_monthly_amount: Number(patientData.financials?.emi_monthly_amount) || 0
    },
    appointment_booking: patientData.appointment_booking
  };

  // Auto EMI calculation if provided on manual creation
  if (newPatient.financials.payment_mode === 'EMI' && newPatient.financials.emi_months > 0) {
    newPatient.financials.emi_monthly_amount = Math.round(newPatient.financials.total_cost / newPatient.financials.emi_months);
    newPatient.financials.payment_status = 'Active EMI';
  }

  patients.push(newPatient);

  // Auto notify doctor
  const notif = {
    id: 'notif_' + Math.floor(1000 + Math.random() * 9000),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    patient_name: `${newPatient.first_name} ${newPatient.last_name}`,
    transitioned_to: newPatient.current_stage,
    action_by: 'Receptionist',
    summary: `Onboarded patient ${newPatient.first_name} ${newPatient.last_name} directly to ${newPatient.current_stage}.`
  };
  notifications.unshift(notif);

  savePatientToFirestore(newPatient).catch(err => console.error(err));
  saveNotificationToFirestore(notif).catch(err => console.error(err));

  res.json({ success: true, patient: newPatient });
});

// Manual update / transition for patient
app.post('/api/patients/manual-update', (req: Request, res: Response) => {
  const { patient_id, notes, stage } = req.body;
  const patient = patients.find(p => p.patient_id === patient_id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  if (stage) {
    patient.current_stage = stage;
  }

  if (notes) {
    patient.history.push(notes);
  }

  // Create doctor notification
  const manualNotif = {
    id: 'notif_' + Math.floor(1000 + Math.random() * 9000),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    patient_name: `${patient.first_name} ${patient.last_name}`,
    transitioned_to: patient.current_stage,
    action_by: 'Staff/Doctor',
    summary: notes ? notes.replace(/Logged by.*?\|/, '').trim() : `Updated stage to ${patient.current_stage}.`
  };
  notifications.unshift(manualNotif);

  savePatientToFirestore(patient).catch(err => console.error(err));
  saveNotificationToFirestore(manualNotif).catch(err => console.error(err));

  res.json({ success: true, patient });
});

// Full update for patient details
app.post('/api/patients/update-full', (req: Request, res: Response) => {
  const patientData = req.body;
  if (!patientData.patient_id) {
    return res.status(400).json({ error: 'patient_id is required' });
  }

  const idx = patients.findIndex(p => p.patient_id === patientData.patient_id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  // Interlock Rule: If Date of Birth (DoB) is filled, instantly disable manual Age field
  // and auto-calculate age based on year 2026.
  let ageCalculated = Number(patientData.age_calculated) || patients[idx].age_calculated || 0;
  let ageDob = patientData.age_dob || patients[idx].age_dob || 'N/A';

  if (patientData.dob && String(patientData.dob).trim()) {
    const dobStr = String(patientData.dob).trim();
    let birthYear: number | null = null;
    
    const partsSlash = dobStr.split('/');
    if (partsSlash.length === 3) {
      birthYear = parseInt(partsSlash[2], 10);
    } else {
      const partsHyphen = dobStr.split('-');
      if (partsHyphen.length === 3) {
        if (partsHyphen[0].length === 4) {
          birthYear = parseInt(partsHyphen[0], 10);
        } else {
          birthYear = parseInt(partsHyphen[2], 10);
        }
      }
    }
    
    if (!birthYear || isNaN(birthYear)) {
      const parsedDate = new Date(dobStr);
      if (!isNaN(parsedDate.getTime())) {
        birthYear = parsedDate.getFullYear();
      }
    }

    if (birthYear && !isNaN(birthYear) && birthYear > 1900 && birthYear <= 2026) {
      ageCalculated = 2026 - birthYear;
      ageDob = `${ageCalculated} years old`;
    }
  }

  const existing = patients[idx];
  const updatedPatient: Patient = {
    ...existing,
    ...patientData,
    age_calculated: ageCalculated,
    age_dob: ageDob,
    history: patientData.history || existing.history,
    financials: {
      ...existing.financials,
      ...(patientData.financials || {})
    }
  };

  patients[idx] = updatedPatient;
  savePatientToFirestore(updatedPatient).catch(err => console.error(err));

  res.json({ success: true, patient: updatedPatient });
});

// --------------------------------------------------------------------------
// AI-Powered Update Engine
// --------------------------------------------------------------------------
app.post('/api/patients/ai-update', async (req: Request, res: Response) => {
  const { input_text, current_patient_state } = req.body;

  if (!input_text) {
    return res.status(400).json({ error: 'Clinical entry input_text is required.' });
  }

  // 1. Check if Gemini Key is available
  const hasGeminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

  if (hasGeminiKey) {
    try {
      // Lazy init Gemini SDK
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Formulate prompt
      const prompt = `You are the centralized backend intelligence engine for a Dental Clinic Practice Management CRM. You manage the initial registration of patient case profiles, validate input dependencies (DoB vs. Age), structure in-clinic appointment bookings based on specific UI form behaviors, and track clinical pipelines.

---

# 📝 Module 1: Register Patient Case Profile
When onboarding a patient, enforce the following primary validation rules and structural field layout:
* **Mandatory Fields (*):** Salutation, First Name, Last Name, Gender, and Mobile Number.
* **Interlock Rule:** If Date of Birth (DoB) is filled, instantly disable the Age field and auto-calculate age based on year 2026. If skipped, the user manually enters the Age (Years).

---

# 📅 Module 2: Next Step - Appointment Booking Engine & Dropdowns

### 🦷 1. Predefined Clinical Specialties
The Specialty dropdown menu must strictly contain only the following options:
1. \`General Dentistry\`
2. \`Endodontics\`
3. \`Orthodontics\`
4. \`Prosthodontics\`
5. \`Periodontics\`
6. \`Oral Surgery\`

### 🩺 2. Dentist Selection Logic
* **Default State:** The Recommended Dentist dropdown field defaults to \`null\` (Empty/Select Doctor).
* **Dropdown Option Loop:** When the user clicks the Dentist dropdown, show any existing matching doctors, followed by a permanent button option: **"+ Add Doctor"**.

---

### 🗔 3. Simulated "+ Add Doctor" Pop-up Window
When the user selects "+ Add Doctor", instantly trigger a secondary layout block simulating a modal pop-up form. This form requires the following field validations:
* **Full Name:** * (Text input)
* **Speciality:** * (Dropdown linked to the 6 Clinical Specialties listed above)
* **Phone No.:** * (10-digit validation)
* **Email Id:** * (Text input)
* **Medical Registration Number:** * (Alphanumeric unique identifier input)
* **Qualifications:** * (Text input, e.g., BDS, MDS)
* **Select Hospital:** * (Multi-Selection Enabled Checkbox List of: \`BTM\`, \`Koramangala\`, \`ECity\`, \`Konankunte\`, \`Uttarahalli\`)

*Behavior:* Once the user saves this pop-up data, inject this new doctor record into the system registry memory so they appear under their respective specialty dropdown.

---

### DIRECT DIRECTION TO FOLLOW:
- Update the doctor_registry based on any additions or modifications in the log.
- Generate EXACTLY the "Standardized UI Output Format" layout. Do not skip any header, bolding, or markdown formatting.
- At the very bottom of your response, output a single '### 💾 ARCHITECTURAL STATE PAYLOAD (JSON Data Layer)' block containing the updated state matching the required JSON schema EXACTLY.

Current Doctor Registry:
\${JSON.stringify(doctorRegistry)}

Current Patient State (Before Update):
\${JSON.stringify(current_patient_state || {}, null, 2)}

Receptionist / Junior Doctor Clinical Log Input:
"\${input_text}"

Expected Response Output Layout:

## 📅 Appointment Booking Component
* **Appointment Type:** 🏢 Fixed: In-Clinic Appointment
* **Speciality Dropdown:** [Select Specialty from the 6 Predefined Options]
* **Recommended Dentist Dropdown:** null (or Selected Doctor name) *(Click to expand list or select "+ Add Doctor")*

---

### 🗔 [POP-UP DIALOG]: Add New Doctor Profile
*(Only include this if log indicates triggering + Add Doctor, otherwise omit or show state)*
* **Full Name:** <span style="color:red">*</span> [Full Name]
* **Speciality:** <span style="color:red">*</span> [Speciality]
* **Phone No.:** <span style="color:red">*</span> [Phone No.]
* **Email Id:** <span style="color:red">*</span> [Email Id]
* **Medical Registration Number:** <span style="color:red">*</span> [Med Reg No.]
* **Qualifications:** <span style="color:red">*</span> [Qualifications]
* **Select Hospital (Multi-Select):** <span style="color:red">*</span> \`[ ] BTM\`  \`[ ] Koramangala\`  \`[ ] ECity\`  \`[ ] Konankunte\`  \`[ ] Uttarahalli\`

---
### 💾 ARCHITECTURAL STATE PAYLOAD (JSON Data Layer)
\`\`\`json
{
  "specialties_catalog": [
    "General Dentistry", "Endodontics", "Orthodontics", "Prosthodontics", "Periodontics", "Oral Surgery"
  ],
  "doctor_registry": [
    {
      "name": "Dr. Amit Sharma",
      "specialty": "General Dentistry",
      "fees": 500,
      "phone": "9876543210",
      "email": "amit@clinic.com",
      "med_reg": "DC-12345",
      "qualifications": "BDS, MDS",
      "hospitals": ["BTM"]
    }
  ],
  "current_booking_view": {
    "selected_specialty": "[Selected Specialty]",
    "selected_dentist": "[Selected doctor name or null]",
    "consultation_fees": [Consultation fee of the doctor, number],
    "booking_type": "[Walk-in | Online]",
    "patient_category": "[Patient Category]",
    "case_type": "[Case Type]"
  },
  "ui_popups": {
    "add_doctor_modal_open": [true | false]
  },
  "active_registration": {
    "full_name": "[First and Last Name]", 
    "mobile": "[10-digit mobile]", 
    "dob_or_age": "[DD/MM/YYYY or Age in years]"
  }
}
\`\`\`
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      const responseText = response.text || '';

      // Parse JSON out of response
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = responseText.match(jsonRegex);

      let parsedPatientState: Patient | null = null;
      if (match && match[1]) {
        try {
          const architecturalState = JSON.parse(match[1]);
          
          // Update global doctor registry if provided
          if (Array.isArray(architecturalState.doctor_registry)) {
            architecturalState.doctor_registry.forEach((doc: any) => {
              if (doc.name && doc.specialty) {
                const existing = doctorRegistry.find(d => d.name.toLowerCase() === doc.name.toLowerCase());
                if (existing) {
                  existing.specialty = doc.specialty;
                  existing.fees = Number(doc.fees) || existing.fees;
                } else {
                  doctorRegistry.push({
                    name: doc.name,
                    specialty: doc.specialty,
                    fees: Number(doc.fees) || 500
                  });
                }
              }
            });
          }

          const activeReg = architecturalState.active_registration || {};
          const curBooking = architecturalState.current_booking_view || architecturalState.current_booking || {};

          // Extract first and last name from full name
          const fullName = activeReg.full_name || '';
          const nameParts = fullName.trim().split(/\s+/);
          const firstName = nameParts[0] || current_patient_state?.first_name || 'Generic';
          const lastName = nameParts.slice(1).join(' ') || current_patient_state?.last_name || 'Patient';

          let dob = current_patient_state?.dob || '';
          let age = current_patient_state?.age_calculated || 30;

          if (activeReg.dob_or_age) {
            const val = String(activeReg.dob_or_age).trim();
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
              dob = val;
              const yrPart = Number(val.split('/')[2]);
              if (yrPart) {
                age = 2026 - yrPart;
              }
            } else {
              age = Number(val.replace(/[^0-9]/g, '')) || age;
              dob = '';
            }
          }

          parsedPatientState = {
            patient_id: current_patient_state?.patient_id || 'patient_' + Math.floor(1000 + Math.random() * 9000),
            salutation: current_patient_state?.salutation || 'Mr.',
            first_name: firstName,
            last_name: lastName,
            gender: current_patient_state?.gender || 'Male',
            mobile: activeReg.mobile || current_patient_state?.mobile || '',
            email: current_patient_state?.email || '',
            dob: dob,
            age_calculated: age,
            age_dob: `${age} years old`,
            current_stage: curBooking.doctor_name ? 'STAGE_2: APPOINTMENT_SCHEDULED' : (current_patient_state?.current_stage || 'STAGE_1: FOLLOW_UP'),
            history: current_patient_state?.history || [],
            selected_payment_mode: current_patient_state?.selected_payment_mode || 'Not Selected',
            active_treatment_plans: current_patient_state?.active_treatment_plans || [],
            financials: current_patient_state?.financials || {
              total_cost: 0,
              payment_mode: 'Not Selected',
              payment_status: 'Pending',
              emi_months: 0,
              emi_monthly_amount: 0
            },
            appointment_booking: curBooking.doctor_name ? {
              appointment_type: 'In-Clinic Appointment',
              speciality: curBooking.specialty || '',
              doctor_name: curBooking.doctor_name || '',
              consultation_fees: Number(curBooking.fees) || 500,
              booking_type: curBooking.booking_type === 'Online' ? 'Online' : 'Walk-in',
              appointment_date: current_patient_state?.appointment_booking?.appointment_date || new Date().toISOString().split('T')[0],
              patient_category: curBooking.patient_category || 'General',
              case_type: curBooking.case_type || 'New Consultation',
              appointment_slot: curBooking.selected_slot || ''
            } : current_patient_state?.appointment_booking
          };

          // Update active treatment plan grand total
          let grandTotal = 0;
          if (architecturalState.active_treatment_plans) {
            architecturalState.active_treatment_plans.forEach((plan: any) => {
              if (plan.billing_items) {
                plan.billing_items.forEach((item: any) => {
                  grandTotal += Number(item.final_total) || 0;
                });
              }
            });
          }
          parsedPatientState.financials.total_cost = grandTotal;
          parsedPatientState.financials.payment_mode = parsedPatientState.selected_payment_mode;

          // Align EMI calculations if EMI mode is selected and months are given
          const matchedMonths = input_text.match(/(\d+)\s*(?:month|mos)/i);
          if (parsedPatientState.selected_payment_mode === 'EMI' && matchedMonths) {
            const months = parseInt(matchedMonths[1], 10);
            parsedPatientState.financials.emi_months = months;
            parsedPatientState.financials.emi_monthly_amount = Math.round(grandTotal / months);
            parsedPatientState.financials.payment_status = 'Active EMI';
          } else if (parsedPatientState.selected_payment_mode === 'EMI' && parsedPatientState.financials.emi_months > 0) {
            parsedPatientState.financials.emi_monthly_amount = Math.round(grandTotal / parsedPatientState.financials.emi_months);
          } else if (parsedPatientState.selected_payment_mode !== 'EMI') {
            parsedPatientState.financials.payment_status = parsedPatientState.selected_payment_mode === 'Not Selected' ? 'Pending' : 'Fully Paid';
          }

          // Append to history
          parsedPatientState.history.push(`Logged by Clinic Staff | clinical intelligence: ${input_text}`);

        } catch (e) {
          console.error('Failed to parse state layer JSON from Gemini output: ', e);
        }
      }

      // If parsing fails, construct fallbacks
      if (!parsedPatientState) {
        parsedPatientState = fallbackLocalUpdate(input_text, current_patient_state);
      }

      // Keep backend state synchronized
      synchronizePatientStore(parsedPatientState);

      // Extract and record notifications
      extractAndRecordNotification(parsedPatientState, input_text);

      return res.json({
        markdown: responseText,
        parsed_patient: parsedPatientState
      });

    } catch (error) {
      console.error('Gemini API Error, falling back: ', error);
      // Fail gracefully to local rules engine on error
    }
  }

  // 2. Gracious high-fidelity Local Fallback Parser if Gemini fails or Key is absent
  console.log('Using local fallback rules engine.');
  const parsed_patient = fallbackLocalUpdate(input_text, current_patient_state);
  const markdown = generateStandardMarkdownResponse(parsed_patient, input_text);

  // Keep backend stores in sync
  synchronizePatientStore(parsed_patient);
  
  // Create notifications
  extractAndRecordNotification(parsed_patient, input_text);

  return res.json({
    markdown,
    parsed_patient
  });
});

// --------------------------------------------------------------------------
// Treatment Plan Generator Route & Save Route (Staff Module)
// --------------------------------------------------------------------------

// Local Heuristic Treatment Notes Parser
function localTreatmentPlanParser(input_text: string) {
  const normalized = input_text.toLowerCase();
  const treatmentPlan: any[] = [];
  let s_no = 1;

  // Let's identify matches for different treatments:
  // e.g. "scaling", "rct", "root canal", "filling", "extraction", "crown", "cap", "laser"
  const keywords = [
    { name: 'Root Canal Treatment (RCT)', regex: /(?:rct|root\s*canal)/i, rate: 4000, is_custom: false },
    { name: 'Composite Filling', regex: /filling/i, rate: 1500, is_custom: false },
    { name: 'Extraction', regex: /extraction/i, rate: 2000, is_custom: false },
    { name: 'Crown/Cap', regex: /(?:crown|cap)/i, rate: 5000, is_custom: false },
    { name: 'Scaling & Polishing', regex: /scaling/i, rate: 1000, is_custom: false }
  ];

  // Also check if they mentioned custom ones
  const customKeywords = [
    { name: 'Deep Laser Sterilization', regex: /(?:laser|sterilization)/i, rate: 3000, is_custom: true }
  ];

  // Try parsing teeth: capture any sequences of 11-48
  const allTeeth = Array.from(input_text.matchAll(/\b(11|12|13|14|15|16|17|18|21|22|23|24|25|26|27|28|31|32|33|34|35|36|37|38|41|42|43|44|45|46|47|48)\b/g)).map(m => parseInt(m[1]));
  
  // Let's match treatments from text
  // Simple heuristic: let's split the text by phrases like "and", "also", "."
  const phrases = input_text.split(/(?:and|also|\.)+/i);
  
  for (const phrase of phrases) {
    if (!phrase.trim()) continue;
    let matchedKwObj: any = null;
    
    // Check standard keywords
    for (const kw of keywords) {
      if (kw.regex.test(phrase)) {
        matchedKwObj = kw;
        break;
      }
    }
    // Check custom keywords
    if (!matchedKwObj) {
      for (const kw of customKeywords) {
        if (kw.regex.test(phrase)) {
          matchedKwObj = kw;
          break;
        }
      }
    }

    if (matchedKwObj) {
      // Find teeth mentioned in this phrase
      const teethInPhrase = Array.from(phrase.matchAll(/\b(11|12|13|14|15|16|17|18|21|22|23|24|25|26|27|28|31|32|33|34|35|36|37|38|41|42|43|44|45|46|47|48)\b/g)).map(m => parseInt(m[1]));
      
      // If none, maybe fallback to any teeth in parent or default count 1
      const ToothNumbers = teethInPhrase.length > 0 ? teethInPhrase : (allTeeth.length > 0 ? [allTeeth[0]] : [11]);
      
      // Check if price/rate is mentioned in this phrase e.g. "at 4000", "priced at 3000", "is 1500"
      const rateMatch = phrase.match(/(?:at|is|rate|priced|₹|rs)\s*(\d+)/i);
      let itemRate = matchedKwObj.rate;
      let missingRate = false;
      if (rateMatch) {
        itemRate = parseInt(rateMatch[1]);
      } else {
        // If not stated in phrase, maybe check if there's any number like 1500 or 3000
        const numberMatch = phrase.match(/\b(1200|1500|2000|3000|4000|5000|6000)\b/);
        if (numberMatch) {
          itemRate = parseInt(numberMatch[1]);
        } else {
          // If no rate is mentioned, let's treat it as missing/auto-fetch flag requested by user
          missingRate = true;
        }
      }

      treatmentPlan.push({
        s_no: s_no++,
        treatment_name: matchedKwObj.name + (matchedKwObj.is_custom ? ' [Custom]' : ''),
        is_custom: matchedKwObj.is_custom,
        tooth_numbers: ToothNumbers,
        rate: missingRate ? 0 : itemRate,
        count: ToothNumbers.length,
        estimate: missingRate ? 0 : (itemRate * ToothNumbers.length),
        missing_rate: missingRate
      });
    }
  }

  // If nothing matched, construct a default/custom one based on input!
  if (treatmentPlan.length === 0) {
    // Try to parse some teeth
    const ToothNumbers = allTeeth.length > 0 ? allTeeth : [11];
    treatmentPlan.push({
      s_no: 1,
      treatment_name: 'Custom Procedure [Custom]',
      is_custom: true,
      tooth_numbers: ToothNumbers,
      rate: 2500,
      count: ToothNumbers.length,
      estimate: 2500 * ToothNumbers.length,
      missing_rate: false
    });
  }

  // Calculate grand total
  const grand_total_estimate = treatmentPlan.reduce((acc, item) => acc + item.estimate, 0);

  // Generate beautiful markdown table
  let markdown = '## 🦷 Treatment Plan Breakdown\n\n';
  markdown += '| S.No | Treatment | Tooth No. | Rate | Count | Estimate |\n';
  markdown += '| :--- | :--- | :--- | :--- | :--- | :--- |\n';
  
  treatmentPlan.forEach((item) => {
    const toothStr = item.tooth_numbers.join(', ');
    const rateStr = item.missing_rate ? '[Auto-Fetch from Billing Module]' : `₹${item.rate.toLocaleString()}`;
    const estimateStr = item.missing_rate ? '[Auto-Fetch from Billing Module]' : `₹${item.estimate.toLocaleString()}`;
    markdown += `| ${item.s_no} | ${item.treatment_name} | ${toothStr} | ${rateStr} | ${item.count} | ${estimateStr} |\n`;
  });

  markdown += `\n### 🧾 Financial Grand Total\n`;
  markdown += `* **Total Estimated Treatment Cost:** **₹${grand_total_estimate.toLocaleString()}**\n\n`;

  // Append developer payload
  markdown += '### 💾 DEVELOPER EXPORT PAYLOAD (JSON)\n';
  markdown += '```json\n';
  
  const devPayloadObject = {
    treatment_plan: treatmentPlan.map(item => ({
      s_no: item.s_no,
      treatment_name: item.treatment_name.replace(' [Custom]', ''),
      is_custom: item.is_custom,
      tooth_numbers: item.tooth_numbers,
      rate: item.rate,
      count: item.count,
      estimate: item.estimate
    })),
    grand_total_estimate
  };
  
  markdown += JSON.stringify(devPayloadObject, null, 2);
  markdown += '\n```\n';

  return {
    markdown,
    parsed: devPayloadObject
  };
}

app.post('/api/patients/treatment-plan/generate', async (req: Request, res: Response) => {
  const { notes_text } = req.body;

  if (!notes_text) {
    return res.status(400).json({ error: 'Clinical notes text is required.' });
  }

  const hasGeminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

  if (hasGeminiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const prompt = `You are the intelligent automation engine for a Clinic CRM's Treatment Plan Module. Your job is to process clinical treatment notes entered by dentists or junior staff, map them to specific tooth numbers, handle billing rates, and automatically calculate counts and financial estimates based on precise mathematical rules.

---

### STAGE TRANSITION & RULES
1. **Treatment Name:** Must map to standard dental procedures (e.g., Root Canal Treatment (RCT), Composite Filling, Extraction, Crown/Cap). If a treatment is unique or not standard, flag it as \`[Custom Treatment]\` or add the label \`[Custom]\` tag.
2. **Tooth No.:** Supports multi-selection. Must capture every specific tooth number mentioned by the dentist (using standard notations like 11-18, 21-28, 31-38, 41-48 or universal system).
3. **Rate:** The baseline cost per single tooth for that specific treatment.
4. **Count:** Auto-calculated. This must exactly equal the total number of individual teeth selected in the "Tooth No." field.
5. **Estimate Formula:** Strictly compute the total estimate for that specific line item using the formula: Estimate = Rate * Count.
6. **Missing Rate:** If a rate is missing from the user's text input, default the rate to 0 in JSON, and use the placeholder flag \`[Auto-Fetch from Billing Module]\` for the Rate and Estimate column in the markdown table.

---

### DIRECT DIRECTION TO FOLLOW:
Generate EXACTLY the Standardized Markdown Output structure. Do not skip any header, bolding, or markdown table formatting.
At the very bottom of your response, output a single '### 💾 DEVELOPER EXPORT PAYLOAD (JSON)' block containing the parsed data as raw code-block JSON.

User Input Clinical Notes:
"${notes_text}"

Expected Response Output Layout:
## 🦷 Treatment Plan Breakdown

| S.No | Treatment | Tooth No. | Rate | Count | Estimate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | [Treatment Name] | [e.g., 18, 17] | [Amount, e.g. ₹1,500 or placeholder] | [Calculated Count] | [Calculated Estimate, e.g. ₹3,000 or placeholder] |

### 🧾 Financial Grand Total
* **Total Estimated Treatment Cost:** **[Sum of all item Estimates, e.g., ₹7,500]**

### 💾 DEVELOPER EXPORT PAYLOAD (JSON)
\`\`\`json
{
  "treatment_plan": [
    {
      "s_no": 1,
      "treatment_name": "string",
      "is_custom": false,
      "tooth_numbers": [],
      "rate": 0,
      "count": 0,
      "estimate": 0
    }
  ],
  "grand_total_estimate": 0
}
\`\`\`
`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      const responseText = aiResponse.text || '';

      // Parse JSON out of response
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = responseText.match(jsonRegex);

      let parsedPayload: any = null;
      if (match && match[1]) {
        try {
          parsedPayload = JSON.parse(match[1]);
        } catch (e) {
          console.error('Failed to parse state layer JSON from treatment-plan generator output: ', e);
        }
      }

      if (!parsedPayload) {
        // Run fallback
        const fallback = localTreatmentPlanParser(notes_text);
        parsedPayload = fallback.parsed;
      }

      return res.json({
        markdown: responseText,
        parsed: parsedPayload
      });

    } catch (error) {
      console.error('Gemini API Error for treatment-plan, falling back: ', error);
    }
  }

  // Gracious high-fidelity Local Fallback Parser if Gemini fails or Key is absent
  console.log('Using local fallback rules engine for treatment plan.');
  const { markdown, parsed } = localTreatmentPlanParser(notes_text);
  return res.json({
    markdown,
    parsed
  });
});

app.post('/api/patients/update-treatment-plan', (req: Request, res: Response) => {
  const { patient_id, markdown, json_payload, grand_total } = req.body;

  if (!patient_id) {
    return res.status(400).json({ error: 'patient_id is required.' });
  }

  const patient = patients.find(p => p.patient_id === patient_id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  // Update financials and stage
  patient.financials.total_cost = Number(grand_total) || 0;
  patient.current_stage = 'STAGE_3: TREATMENT_PLAN_SHARED';
  
  // If previously EMI was locked but the cost changed, recalculate monthly amount
  if (patient.financials.payment_mode === 'EMI' && patient.financials.emi_months > 0) {
    patient.financials.emi_monthly_amount = Math.round(patient.financials.total_cost / patient.financials.emi_months);
  }

  // Save the plan data
  patient.treatment_plan_markdown = markdown;
  patient.treatment_plan_json = typeof json_payload === 'string' ? json_payload : JSON.stringify(json_payload, null, 2);

  // Append history note
  patient.history.push(`Logged by Practice Staff | Treatment plan generated & shared with patient. Estimated Total: ₹${Number(grand_total).toLocaleString()}`);

  // Create senior doctor notification
  const notif = {
    id: 'notif_' + Math.floor(1000 + Math.random() * 9000),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    patient_name: `${patient.first_name} ${patient.last_name}`,
    transitioned_to: patient.current_stage,
    action_by: 'Practice Staff',
    summary: `Shared structured treatment plan costing ₹${Number(grand_total).toLocaleString()}.`
  };
  notifications.unshift(notif);

  // Limit notifications log size to 15
  if (notifications.length > 15) {
    notifications = notifications.slice(0, 15);
  }

  savePatientToFirestore(patient).catch(err => console.error(err));
  saveNotificationToFirestore(notif).catch(err => console.error(err));

  res.json({ success: true, patient });
});

// Update patient record with advanced treatment plans, visit logs, and payment mode info
app.post('/api/patients/update-full', (req: Request, res: Response) => {
  const updatedPatient: Patient = req.body;
  if (!updatedPatient.patient_id) {
    return res.status(400).json({ error: 'patient_id is required.' });
  }

  const index = patients.findIndex(p => p.patient_id === updatedPatient.patient_id);
  if (index === -1) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  // Interlock Rule: If Date of Birth (DoB) is filled, instantly disable manual Age field
  // and auto-calculate age based on year 2026.
  let ageCalculated = Number(updatedPatient.age_calculated) || patients[index].age_calculated || 0;
  let ageDob = updatedPatient.age_dob || patients[index].age_dob || 'N/A';

  if (updatedPatient.dob && String(updatedPatient.dob).trim()) {
    const dobStr = String(updatedPatient.dob).trim();
    let birthYear: number | null = null;
    
    const partsSlash = dobStr.split('/');
    if (partsSlash.length === 3) {
      birthYear = parseInt(partsSlash[2], 10);
    } else {
      const partsHyphen = dobStr.split('-');
      if (partsHyphen.length === 3) {
        if (partsHyphen[0].length === 4) {
          birthYear = parseInt(partsHyphen[0], 10);
        } else {
          birthYear = parseInt(partsHyphen[2], 10);
        }
      }
    }
    
    if (!birthYear || isNaN(birthYear)) {
      const parsedDate = new Date(dobStr);
      if (!isNaN(parsedDate.getTime())) {
        birthYear = parsedDate.getFullYear();
      }
    }

    if (birthYear && !isNaN(birthYear) && birthYear > 1900 && birthYear <= 2026) {
      ageCalculated = 2026 - birthYear;
      ageDob = `${ageCalculated} years old`;
    }
  }

  // Overwrite clinical fields safely while preserving fallback data where applicable
  patients[index] = {
    ...patients[index],
    ...updatedPatient,
    age_calculated: ageCalculated,
    age_dob: ageDob,
    history: updatedPatient.history || patients[index].history,
  };

  // Add a doctor notification if status transitions
  const fullNotif = {
    id: 'notif_' + Math.floor(1000 + Math.random() * 9000),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    patient_name: `${patients[index].first_name} ${patients[index].last_name}`,
    transitioned_to: patients[index].current_stage,
    action_by: 'Staff Physician',
    summary: `Treatment configuration locked with payment mode: ${patients[index].selected_payment_mode || 'None SELECTED'}.`
  };
  notifications.unshift(fullNotif);

  if (notifications.length > 15) {
    notifications = notifications.slice(0, 15);
  }

  savePatientToFirestore(patients[index]).catch(err => console.error(err));
  saveNotificationToFirestore(fullNotif).catch(err => console.error(err));

  res.json({ success: true, patient: patients[index], notifications });
});

// Update the stored list matching on first_name/last_name or ID
function synchronizePatientStore(updated: Patient) {
  const index = patients.findIndex(p => p.patient_id === updated.patient_id || (p.first_name.toLowerCase() === updated.first_name.toLowerCase() && p.last_name.toLowerCase() === updated.last_name.toLowerCase()));
  if (index !== -1) {
    patients[index] = updated;
  } else {
    // If it's a completely new patient generated, set a random ID and save
    if (!updated.patient_id || updated.patient_id === 'auto_generated') {
      updated.patient_id = generateId();
    }
    patients.push(updated);
  }
  savePatientToFirestore(updated).catch(err => console.error(err));
}

// Generate notifications directly from clinical actions and stages
function extractAndRecordNotification(patient: Patient, last_input: string) {
  // Determine author role from text input if possible
  let action_by = 'Receptionist';
  if (last_input.toLowerCase().includes('doctor') || last_input.toLowerCase().includes('dr.')) {
    action_by = 'Junior Doctor';
  }

  // Calculate succinct summary
  let summary = `Patient lifecycle updated log: ${last_input}`;
  if (last_input.toLowerCase().includes('whitening')) {
    summary = 'Inquired about whitening treatments and placed in follow-up.';
  } else if (last_input.toLowerCase().includes('accepted') && last_input.toLowerCase().includes('emi')) {
    summary = `Accepted treatment plan costing ₹${patient.financials.total_cost.toLocaleString()} via EMI mode.`;
  } else if (last_input.toLowerCase().includes('appointment') || last_input.toLowerCase().includes('appt')) {
    summary = `Clinical diagnostic visitation appointment has been successfully booked.`;
  } else if (last_input.toLowerCase().includes('root canal') || last_input.toLowerCase().includes('treatment plan')) {
    summary = `Treatment proposal shared with patient for the recommended procedures.`;
  }

  // Push new notification
  const newNotif = {
    id: 'notif_' + Math.floor(1000 + Math.random() * 9000),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    patient_name: `${patient.first_name} ${patient.last_name}`,
    transitioned_to: patient.current_stage,
    action_by,
    summary
  };
  notifications.unshift(newNotif);
  saveNotificationToFirestore(newNotif).catch(err => console.error(err));

  // Limit notifications log size to 15
  if (notifications.length > 15) {
    notifications = notifications.slice(0, 15);
  }
}

// --------------------------------------------------------------------------
// Local Heuristic / State Machine Fallback Parser (Robust & Deterministic)
// --------------------------------------------------------------------------
function fallbackLocalUpdate(input_text: string, current_state: any): Patient {
  const normalized = input_text.toLowerCase();
  
  // Extract Role
  let role = 'Receptionist';
  if (normalized.includes('doctor') || normalized.includes('junior doctor') || normalized.includes('dr.')) {
    role = 'Junior Doctor';
  }

  // If we have an existing state, start there. Otherwise parse or create a new patient
  let state: Patient;
  
  // Extract Mobile and Email first
  const mobMatch = input_text.match(/\b(\d{10})\b/) || normalized.match(/mobile:?\s*(\d{10})/i);
  const parsedMobile = mobMatch ? mobMatch[1] : '';

  const emailMatch = input_text.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/) || normalized.match(/email:?\s*([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
  const parsedEmail = emailMatch ? emailMatch[1] : '';

  if (current_state && current_state.first_name) {
    state = JSON.parse(JSON.stringify(current_state)); // Deep clone
    if (parsedMobile) state.mobile = parsedMobile;
    if (parsedEmail) state.email = parsedEmail;
  } else {
    // Attempt parsing name, gender, dob, salutation from onboarding text
    const salMatch = normalized.match(/salutation\s+(?:is|of)?\s*(mr|mrs|ms|dr|master)\.?/i) || input_text.match(/\b(Mr|Mrs|Ms|Dr|Master)\b\.?/i);
    const salutation = salMatch ? (salMatch[1].charAt(0).toUpperCase() + salMatch[1].slice(1).toLowerCase() + (salMatch[1].toLowerCase() === 'mr' || salMatch[1].toLowerCase() === 'dr' ? '.' : '')) : 'Mr.';
    
    // Support "Ms. Sneha Rao" patterns
    const nameWithSalutationMatch = input_text.match(/\b(Mr|Mrs|Ms|Dr|Master)\b\.?\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/i);
    let firstName = 'Arjun';
    let lastName = 'Kapoor';
    if (nameWithSalutationMatch) {
      firstName = nameWithSalutationMatch[2];
      lastName = nameWithSalutationMatch[3];
    } else {
      const firstMatch = normalized.match(/first\s*name\s+(?:is|of)?\s*([a-z]+)/i) || input_text.match(/\b([A-Z][a-z]+)\b/);
      if (firstMatch) firstName = firstMatch[1].charAt(0).toUpperCase() + firstMatch[1].slice(1).toLowerCase();

      const lastMatch = normalized.match(/last\s*name\s+(?:is|of)?\s*([a-z]+)/i) || input_text.match(/\b[A-Z][a-z]+\s+([A-Z][a-z]+)\b/);
      if (lastMatch) lastName = lastMatch[1].charAt(0).toUpperCase() + lastMatch[1].slice(1).toLowerCase();
    }

    let gender = 'Male';
    if (normalized.includes('female') || normalized.includes('woman') || normalized.includes('her')) {
      gender = 'Female';
    } else if (normalized.includes('non-binary')) {
      gender = 'Non-binary';
    }

    const dobMatch = normalized.match(/dob\s+(?:is|of)?\s*(\d{2}\/\d{2}\/\d{4})/i) || input_text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    const dob = dobMatch ? dobMatch[1] : '';

    let ageCalculated = dob ? 30 : null;
    if (dob) {
      const parts = dob.split('/');
      if (parts.length === 3) {
        const yr = parseInt(parts[2], 10);
        if (!isNaN(yr)) {
          ageCalculated = 2026 - yr;
        }
      }
    } else {
      // Parse manual age if DoB is skipped
      const ageMatch = normalized.match(/(\d+)\s*(?:years|years\s*old|yrs|age)/i);
      if (ageMatch) {
        ageCalculated = parseInt(ageMatch[1], 10);
      }
    }

    state = {
      patient_id: 'patient_' + Math.floor(1000 + Math.random() * 9000),
      salutation,
      first_name: firstName,
      last_name: lastName,
      gender,
      mobile: parsedMobile || '9876543210',
      email: parsedEmail || 'unspecified@test.com',
      dob: dob || undefined,
      age_calculated: ageCalculated || 30,
      age_dob: ageCalculated ? `${ageCalculated} years old` : '30 years old',
      current_stage: 'STAGE_1: FOLLOW_UP',
      history: [],
      financials: {
        total_cost: 0,
        payment_mode: 'Not Selected',
        payment_status: 'Pending',
        emi_months: 0,
        emi_monthly_amount: 0
      }
    };
  }

  // Support static "Add Doctor..." parsing in fallback mode
  if (normalized.includes('add doctor')) {
    const docMatch = input_text.match(/add doctor\s+([^,]+),\s*specialty:\s*([^,]+),\s*(?:fees|fee):\s*(\d+)/i);
    if (docMatch) {
      const name = docMatch[1].trim();
      const specialty = docMatch[2].trim();
      const feesVal = parseInt(docMatch[3], 10) || 500;
      
      const existing = doctorRegistry.find(d => d.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.specialty = specialty;
        existing.fees = feesVal;
      } else {
        doctorRegistry.push({ name, specialty, fees: feesVal });
      }
    }
  }

  // Parse appointment details heftily if booking keywords exist
  if (normalized.includes('book') || normalized.includes('appointment') || normalized.includes('consultation')) {
    state.current_stage = 'STAGE_2: APPOINTMENT_SCHEDULED';
    
    let matchedDoc = doctorRegistry.find(d => normalized.includes(d.name.toLowerCase().replace('dr.', '').trim()));
    let doctor = matchedDoc ? matchedDoc.name : 'Dr. Amit Sharma';
    let speciality = matchedDoc ? matchedDoc.specialty : 'General Dentistry';
    let fees = matchedDoc ? matchedDoc.fees : 500;

    if (normalized.includes('amit') || normalized.includes('sharma')) {
      doctor = 'Dr. Amit Sharma';
      speciality = 'General Dentistry';
      fees = 500;
    } else if (normalized.includes('priya') || normalized.includes('nair')) {
      doctor = 'Dr. Priya Nair';
      speciality = 'Orthodontics';
      fees = 1500;
    } else if (normalized.includes('rohan') || normalized.includes('das')) {
      doctor = 'Dr. Rohan Das';
      speciality = 'Endodontics';
      fees = 1200;
    }

    const bookingTypeObj = normalized.includes('online') ? 'Online' : 'Walk-in';

    // Formulate a tomorrow's date or similar
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    state.appointment_booking = {
      appointment_type: 'In-Clinic Appointment',
      speciality,
      doctor_name: doctor,
      consultation_fees: fees,
      booking_type: bookingTypeObj,
      appointment_date: dateStr,
      patient_category: 'General',
      case_type: 'New Consultation'
    };
  }

  // Process logs / state transition
  // Always append inputs to timeline
  state.history.push(`Logged by ${role} | ${input_text.trim()}`);

  // Auto transition rules based on text keyword matching:
  if (normalized.includes('follow') || normalized.includes('whitening') || normalized.includes('inquiring')) {
    state.current_stage = 'STAGE_1: FOLLOW_UP';
  }
  
  if (normalized.includes('appointment') || normalized.includes('scheduled') || normalized.includes('appt') || normalized.includes('booked')) {
    state.current_stage = 'STAGE_2: APPOINTMENT_SCHEDULED';
  }

  const costMatch = input_text.replace(/[,₹$]/g, '').match(/(?:plan of|costing|for|cost|amount of)\s+(\d+)/i);
  let parsedCost = 0;
  if (costMatch) {
    parsedCost = parseInt(costMatch[1], 10);
  }

  if (normalized.includes('plan shared') || normalized.includes('treatment plan') || normalized.includes('molar') || normalized.includes('crown')) {
    state.current_stage = 'STAGE_3: TREATMENT_PLAN_SHARED';
    if (parsedCost > 0) {
      state.financials.total_cost = parsedCost;
    }
  }

  if (normalized.includes('accepted')) {
    state.current_stage = 'STAGE_4: TREATMENT_ACCEPTED';
    if (parsedCost > 0) {
      state.financials.total_cost = parsedCost;
    }
  }

  // Payment completed, structured EMI or paid
  if (normalized.includes('payment') || normalized.includes('paid') || normalized.includes('emi')) {
    if (normalized.includes('emi')) {
      state.financials.payment_mode = 'EMI';
      state.selected_payment_mode = 'EMI';
      state.financials.payment_status = 'Active EMI';

      // Parse EMI Months (Duration)
      let emiMonths = 0;
      const emiMatch = normalized.match(/(\d+)\s*(?:month|mos)/);
      if (emiMatch) {
        emiMonths = parseInt(emiMatch[1], 10);
      }

      if (emiMonths > 0) {
        state.financials.emi_months = emiMonths;
        if (state.financials.total_cost > 0) {
          state.financials.emi_monthly_amount = Math.round(state.financials.total_cost / emiMonths);
        }
        state.current_stage = 'STAGE_5: PAYMENT_COMPLETED';
      }
    } else {
      state.current_stage = 'STAGE_5: PAYMENT_COMPLETED';
      state.financials.payment_status = 'Fully Paid';
      if (normalized.includes('cash')) {
        state.financials.payment_mode = 'Cash';
        state.selected_payment_mode = 'Cash';
      } else if (normalized.includes('upi')) {
        state.financials.payment_mode = 'UPI';
        state.selected_payment_mode = 'UPI';
      } else if (normalized.includes('card')) {
        state.financials.payment_mode = 'Card';
        state.selected_payment_mode = 'Card';
      } else if (normalized.includes('netbanking') || normalized.includes('net banking')) {
        state.financials.payment_mode = 'NetBanking';
        state.selected_payment_mode = 'NetBanking';
      }
    }
  }

  return state;
}

// Format fallback response matching the Exact Standardized Output Markdown structure
function generateStandardMarkdownResponse(p: Patient, updateText: string): string {
  const salutation = p.salutation || 'Mr.';
  const firstName = p.first_name || 'Generic';
  const lastName = p.last_name || 'Patient';
  const gender = p.gender || 'Male';
  const mobile = p.mobile || '9876543210';
  const email = p.email || 'Unspecified';
  const dob = p.dob || '';
  const ageCalculated = p.age_calculated || 30;
  const dobOrAge = dob || `${ageCalculated}`;

  const bSpec = p.appointment_booking?.speciality || 'General Dentistry';
  const bDoc = p.appointment_booking?.doctor_name || 'Dr. Amit Sharma';
  const bFees = p.appointment_booking?.consultation_fees !== undefined ? p.appointment_booking.consultation_fees : 500;
  const bType = p.appointment_booking?.booking_type || 'Walk-in';
  
  const bCategory = p.appointment_booking?.patient_category || 'General';
  const bCaseType = p.appointment_booking?.case_type || 'New Consultation';
  const bSlot = p.appointment_booking?.appointment_slot || '10:00 AM';

  const docRegStr = JSON.stringify(doctorRegistry);

  let branchingOutput = '';
  if (bType === 'Walk-in') {
    branchingOutput = `* *(If Walk-in)* 🟢 **Queue Management:** Patient successfully routed to the active live waiting queue.`;
  } else {
    branchingOutput = `* *(If Online)* 🕒 **Available Time Slots:** \`[09:30 AM]\` \`[10:00 AM]\` \`[11:30 AM]\` (Please select a slot)`;
  }

  let markdown = `## 📋 Registered Case Profile Summary
* **Patient:** ${salutation} ${firstName} ${lastName}
* **Contact:** ${mobile} | ${email}
* **Age/Gender:** ${ageCalculated} years old | ${gender}

---

## 📅 Appointment Booking Component
* **Appointment Type:** 🏢 Fixed: In-Clinic Appointment
* **Speciality Dropdown:** ${bSpec}
* **Doctor Dropdown:** ${bDoc}
* **Consultation Fees:** **₹${bFees}**
* **Booking Type Toggle:** \`[ ${bType} ]\`

### 🔄 Dynamic UI Branching Output
${branchingOutput}

### 📝 Additional Classifications
* **Patient Category:** ${bCategory}
* **Case Type:** ${bCaseType}

---
### 💾 ARCHITECTURAL STATE PAYLOAD (JSON Data Layer)
\`\`\`json
{
  "doctor_registry": ${docRegStr},
  "active_registration": {
    "full_name": "${salutation} ${firstName} ${lastName}".trim(),
    "mobile": "${mobile}",
    "dob_or_age": "${dobOrAge}"
  },
  "current_booking": {
    "specialty": "${bSpec}",
    "doctor_name": "${bDoc}",
    "fees": ${bFees},
    "booking_type": "${bType}",
    "queue_status": "${bType === 'Walk-in' ? 'Patient successfully routed to active waiting queue' : 'Scheduled'}",
    "selected_slot": "${bSlot}",
    "patient_category": "${bCategory}",
    "case_type": "${bCaseType}"
  }
}
\`\`\`
`;

  return markdown;
}

// --------------------------------------------------------------------------
// Auth & Onboarding REST APIs
// --------------------------------------------------------------------------

interface AppUser {
  email: string;
  mobile_no: string;
  first_name: string;
  last_name: string;
  gender: string;
  age_dob: string;
  type: 'doctor' | 'staff';
}

let registeredUsers: AppUser[] = [
  {
    email: 'doctor@dentacare.com',
    mobile_no: '9876543210',
    first_name: 'Sarah',
    last_name: 'Jenkins',
    gender: 'Female',
    age_dob: '42 years old',
    type: 'doctor'
  },
  {
    email: 'staff@dentacare.com',
    mobile_no: '8765432109',
    first_name: 'Clara',
    last_name: 'Oswald',
    gender: 'Female',
    age_dob: '29 years old',
    type: 'staff'
  }
];

// Stores generated OTP codes mapping email -> otp
let otpSessions: Record<string, { mobile_no: string; otp: string; expiredAt: number }> = {};

// 1. Send OTP (for login or onboarding)
app.post('/api/auth/send-otp', (req: Request, res: Response) => {
  const { email, mobile_no, isLogin } = req.body;

  if (!email || !mobile_no) {
    return res.status(400).json({ success: false, error: 'Email and Mobile No. are required.' });
  }

  // If login, check if user exists
  if (isLogin) {
    const user = registeredUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase() || u.mobile_no === mobile_no
    );
    if (!user) {
      return res.status(404).json({ success: false, error: 'No registered user found with this Email or Mobile No.' });
    }
  } else {
    // If onboarding, prevent duplicates
    const emailTaken = registeredUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
    const mobileTaken = registeredUsers.some(u => u.mobile_no === mobile_no);
    if (emailTaken) {
      return res.status(400).json({ success: false, error: 'This Email ID is already registered.' });
    }
    if (mobileTaken) {
      return res.status(400).json({ success: false, error: 'This Mobile Number is already registered.' });
    }
  }

  // Generate random 6-digit OTP code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in sessions with 5-minute expiry
  otpSessions[email.toLowerCase()] = {
    mobile_no,
    otp,
    expiredAt: Date.now() + 5 * 60 * 1000
  };

  console.log(`[AUTH DEMO] Sent OTP ${otp} to Email: ${email}, Phone: ${mobile_no}`);

  return res.json({
    success: true,
    otp, // send in response so the UI helper can display it
    message: `OTP code sent successfully (Demo simulator code: ${otp})`
  });
});

// 2. Verify OTP
app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email ID and OTP code are required.' });
  }

  const session = otpSessions[email.toLowerCase()];
  if (!session) {
    return res.status(400).json({ success: false, error: 'No verification session has been started. Please trigger OTP.' });
  }

  if (Date.now() > session.expiredAt) {
    delete otpSessions[email.toLowerCase()];
    return res.status(400).json({ success: false, error: 'The verification code has expired. Please try again.' });
  }

  if (session.otp !== otp) {
    return res.status(400).json({ success: false, error: 'Incorrect verification OTP entered. Try again.' });
  }

  return res.json({
    success: true,
    message: 'Verification complete! Proceed to complete registration.'
  });
});

// 3. Complete onboarding registration details
app.post('/api/auth/register-complete', (req: Request, res: Response) => {
  const { email, mobile_no, first_name, last_name, gender, age_dob, type } = req.body;

  if (!email || !mobile_no || !first_name || !last_name || !gender || !age_dob || !type) {
    return res.status(400).json({ success: false, error: 'All personal details and role type are required.' });
  }

  const emailTaken = registeredUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
  const mobileTaken = registeredUsers.some(u => u.mobile_no === mobile_no);
  if (emailTaken || mobileTaken) {
    return res.status(400).json({ success: false, error: 'This user contact is already registered.' });
  }

  const role = type === 'doctor' ? 'doctor' : 'staff';

  const newUser: AppUser = {
    email: email.toLowerCase(),
    mobile_no,
    first_name,
    last_name,
    gender,
    age_dob: age_dob.includes('years old') ? age_dob : `${age_dob} years old`,
    type: role
  };

  registeredUsers.push(newUser);
  delete otpSessions[email.toLowerCase()];

  // Persist newly registered user in Postgres SQL Table
  db.insert(schema.users).values({
    id: email.toLowerCase(),
    email: email.toLowerCase(),
    mobileNo: mobile_no,
    firstName: first_name,
    lastName: last_name,
    gender,
    ageDob: age_dob.includes('years old') ? age_dob : `${age_dob} years old`,
    type: role,
  }).then(() => {
    console.log(`Saved newly onboarded user ${email} directly to SQL Database.`);
  }).catch(err => {
    console.error(`SQL user insertion failed for ${email}:`, err);
  });

  console.log(`[AUTH DEMO] Finished Onboarding: ${newUser.first_name} ${newUser.last_name} (${newUser.type})`);

  return res.json({
    success: true,
    user: newUser,
    message: `Account configured! Welcome to the team, ${newUser.first_name}.`
  });
});

// 4. Submit login check
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { emailOrMobile, otp } = req.body;

  if (!emailOrMobile) {
    return res.status(400).json({ success: false, error: 'Email address or Mobile number is required.' });
  }

  const query = emailOrMobile.toLowerCase().trim();
  const user = registeredUsers.find(u => u.email.toLowerCase() === query || u.mobile_no === query);

  if (!user) {
    return res.status(404).json({ success: false, error: 'No registered doctor or assistant staff found with these credentials.' });
  }

  if (otp) {
    const session = otpSessions[user.email.toLowerCase()];
    if (!session || session.otp !== otp) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP code.' });
    }
    delete otpSessions[user.email.toLowerCase()];
  }

  return res.json({
    success: true,
    user,
    message: `Welcome back, ${user.first_name} ${user.last_name}!`
  });
});


// Start Node dev server with Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    // Mount Vite dev server middlewares
    app.use(vite.middlewares);
  } else {
    // Production static directory hosting
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dental Clinic CRM CRM server running on host 0.0.0.0, port ${PORT}`);
  });
}

startServer();
