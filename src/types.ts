/**
 * Patient Lifecycle Stages
 */
export type PatientStage =
  | 'STAGE_1: FOLLOW_UP'
  | 'STAGE_2: APPOINTMENT_SCHEDULED'
  | 'STAGE_3: TREATMENT_PLAN_SHARED'
  | 'STAGE_4: TREATMENT_ACCEPTED'
  | 'STAGE_5: PAYMENT_COMPLETED'
  | 'STAGE_6_CLOSED';

/**
 * Financial breakdown structure
 */
export interface PatientFinancials {
  total_cost: number;         // 0 if N/A
  payment_mode: string;       // Cash, Card, UPI, NetBanking, EMI, "Not Selected"
  payment_status: string;     // Pending, Partially Paid, Fully Paid, Active EMI
  emi_months: number;         // 0 if not EMI
  emi_monthly_amount: number; // calculated installment (C/M)
}

export interface BillingItem {
  tooth_no: number[];
  procedure_name: string;
  base_rate: number;
  count: number;
  discount_percent: number;
  gst_percent: number;
  final_total: number;
}

export interface VisitLog {
  visit_id: string;
  visit_number: string;
  date: string;
  procedure_step: string;
  assigned_teeth: number[];
  conducted_by: string;
  assisted_by: string;
  remarks: string;
}

export interface TreatmentPlan {
  plan_id: string;
  plan_name: string;
  status: 'Treatment in Progress' | 'Treatment Done';
  billing_items: BillingItem[];
  visit_logs: VisitLog[];
}

/**
 * Patient CRM Profile & Journey Structure
 */
export interface Patient {
  patient_id: string;
  salutation?: string;
  first_name: string;
  last_name: string;
  gender: string;
  mobile?: string;
  email?: string;
  dob?: string;
  age_calculated?: number;
  age_dob: string;
  current_stage: PatientStage;
  history: string[]; // Chronological timeline messages
  financials: PatientFinancials;
  treatment_plan_markdown?: string;
  treatment_plan_json?: string;
  active_treatment_plans?: TreatmentPlan[];
  selected_payment_mode?: string; // Cash, UPI, EMI, Clinic EMI, etc.
  category?: string;              // General, VIP, Corporate, Diabetic
  last_visit?: string;            // Last visit date formated DD-MM-YYYY
  appointment_booking?: {
    appointment_type: string; // In-Clinic Appointment, Video Consultation
    speciality: string;
    doctor_name: string;
    consultation_fees: number;
    booking_type: 'Walk-in' | 'Online';
    appointment_date: string;
    patient_category: string;
    case_type: string;
    appointment_slot?: string;
    relation?: string;
  };
}

/**
 * Senior Doctor Notifications
 */
export interface DoctorNotification {
  id: string;
  timestamp: string;
  patient_name: string;
  transitioned_to: string;
  action_by: string; // Receptionist, Junior Doctor, etc.
  summary: string;
}

/**
 * Request payload for the AI Intelligence Engine
 */
export interface AIUpdateResponse {
  markdown: string;             // The formatted markdown output required
  parsed_patient: Patient;      // The current state metadata populated
}
