import { pgTable, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // We can store unique ID or Firebase UID
  email: text('email').notNull(),
  mobileNo: text('mobile_no'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  gender: text('gender'),
  ageDob: text('age_dob'),
  type: text('type'), // 'doctor' | 'staff'
  createdAt: timestamp('created_at').defaultNow(),
});

export const patients = pgTable('patients', {
  patient_id: text('patient_id').primaryKey(),
  salutation: text('salutation'),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  gender: text('gender').notNull(),
  mobile: text('mobile'),
  email: text('email'),
  dob: text('dob'),
  age_calculated: integer('age_calculated'),
  age_dob: text('age_dob').notNull(),
  current_stage: text('current_stage').notNull(),
  history: jsonb('history').notNull().$type<string[]>(), // Array of timeline messages
  financials: jsonb('financials').notNull().$type<{
    total_cost: number;
    payment_mode: string;
    payment_status: string;
    emi_months: number;
    emi_monthly_amount: number;
  }>(),
  treatment_plan_markdown: text('treatment_plan_markdown'),
  treatment_plan_json: text('treatment_plan_json'),
  active_treatment_plans: jsonb('active_treatment_plans').$type<any[]>(), // TreatmentPlan[]
  selected_payment_mode: text('selected_payment_mode'),
  category: text('category'),
  last_visit: text('last_visit'),
  appointment_booking: jsonb('appointment_booking').$type<any>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const doctors = pgTable('doctors', {
  id: text('id').primaryKey(), // name lowercased with underscores
  name: text('name').notNull(),
  specialty: text('specialty').notNull(),
  fees: integer('fees').notNull(),
  phone: text('phone'),
  email: text('email'),
  med_reg: text('med_reg'),
  qualifications: text('qualifications'),
  hospitals: jsonb('hospitals').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  patient_name: text('patient_name').notNull(),
  transitioned_to: text('transitioned_to').notNull(),
  action_by: text('action_by').notNull(),
  summary: text('summary').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
