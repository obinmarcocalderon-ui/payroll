// Shared domain types for the Payroll & Benefits Management System.
// These mirror the shape of data expected from the centralized backend
// (PostgreSQL via a REST API). No mock/sample records are seeded anywhere;
// every list starts empty until the API is connected.

export type ID = string;

// The system has three roles. These values must match the
// backend's App\Models\User::ROLES list.
export type UserRole = 'admin' | 'hr_staff' | 'employee';

// Roles an account can be assigned from User Management. Employee
// accounts are created automatically when an employee record is saved.
export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'hr_staff', label: 'HR Staff' },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  hr_staff: 'HR Staff',
  employee: 'Employee',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}

export interface SystemUser {
  id: ID;
  fullName: string;
  email: string;
  role: UserRole;
  employeeId?: ID | null;
  createdAt: string;
}

export type EmploymentStatus = 'active' | 'on_leave' | 'suspended' | 'separated';
export type EmploymentType = 'regular' | 'probationary' | 'contractual';
export type CivilStatus = 'single' | 'married' | 'widowed' | 'separated';

export interface Employee {
  id: ID;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  department: string;
  position: string;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  civilStatus: CivilStatus;
  dateHired: string; // ISO date
  baseSalary: number;
  loanDeductionPerCutoff: number;
  transportationAllowance: number;
  riceSubsidyAllowance: number;
  sssLoanPerCutoff: number;
  hdmfLoanPerCutoff: number;
  sssNumber?: string | null;
  philhealthNumber?: string | null;
  pagibigNumber?: string | null;
  tinNumber?: string | null;
  shiftStart: string; // "HH:mm:ss"
  shiftEnd: string; // "HH:mm:ss"
}

// ---------- Payroll Management ----------

export type PayrollRunStatus = 'draft' | 'processing' | 'for_approval' | 'approved' | 'released' | 'rejected';

export interface PayrollRun {
  id: ID;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  cutoffLabel: string;
  status: PayrollRunStatus;
  // Set once HR submits/locks the timesheet for this cutoff. Every
  // attendance row becomes read-only once this is non-null, and payroll
  // cannot be computed until it is set.
  timesheetSubmittedAt: string | null;
  isArchived: boolean;
  totalEmployees: number;
  grossTotal: number;
  deductionsTotal: number;
  netTotal: number;
  unresolvedAnomaliesCount: number;
  blockingAnomaliesCount: number;
  createdAt: string;
}

// ---------- AI-Powered Payroll Anomaly Detection ----------

export type AnomalySeverity = 'low' | 'medium' | 'critical';
export type AnomalyStatus = 'unresolved' | 'dismissed' | 'needs_correction';
export type AnomalyType =
  | 'unusual_pay_change'
  | 'high_overtime'
  | 'duplicate_claim'
  | 'missing_statutory_deduction'
  | 'net_pay_error'
  | 'proration_check_needed';

export interface PayrollAnomaly {
  id: ID;
  payrollRunId: ID;
  employeeId: ID;
  employeeName: string;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  suggestedAction: string;
  metrics: Record<string, unknown> | null;
  status: AnomalyStatus;
  blocksApproval: boolean;
  createdAt: string;
}

export interface Payslip {
  id: ID;
  payrollRunId: ID;
  employeeId: ID;
  employeeNumber: string | null;
  employeeName: string;
  department: string;
  basicPay: number;
  taxRefund: number;
  slCashConversion: number;
  overtimePay: number;
  lateUndertimeAbsenceDeduction: number;
  totalSalary: number;
  sssContribution: number;
  philHealthContribution: number;
  hdmfContribution: number;
  taxableSalary: number;
  withholdingTax: number;
  cashAdvance: number;
  sssLoan: number;
  hdmfLoan: number;
  companyLoanDeduction: number;
  netSalary: number;
  transportationAllowance: number;
  riceSubsidyAllowance: number;
  totalRemittance: number;
  status: 'pending' | 'computed' | 'released';
  emailSentAt?: string | null;
  smsSentAt?: string | null;
}

export interface AttendanceSummary {
  id: ID;
  payrollRunId: ID;
  employeeId: ID;
  employeeName: string;
  daysPresent: number;
  lateMinutes: number;
  overtimeHours: number;
  unpaidAbsenceDays: number;
  cashAdvance: number;
  taxRefund: number;
  slCashConversion: number;
}

// ---------- Compensation Planning ----------

// ---------- Attendance / Timesheet ----------

export type HolidayType = 'regular' | 'special_non_working';
export type ClockInStatus = 'on_time' | 'late';
export type ClockOutStatus = 'on_time' | 'overtime';
export type TimesheetDayStatus = 'present' | 'absent' | 'day_off';

export interface AttendanceRecord {
  id: ID;
  employeeId: ID;
  payrollRunId?: ID | null;
  date: string; // ISO date
  status?: TimesheetDayStatus | null;
  timestampIn: string | null;
  timestampOut: string | null;
  statusIn: ClockInStatus | null;
  statusOut: ClockOutStatus | null;
  minutesLate: number;
  overtimeMinutes: number;
  holidayType: HolidayType | null;
  isLocked: boolean;
}

export interface TimesheetEmployeeRow {
  employeeId: ID;
  employeeName: string;
  days: AttendanceRecord[];
}

export interface TimesheetForRun {
  isLocked: boolean;
  timesheetSubmittedAt: string | null;
  sheet: TimesheetEmployeeRow[];
}

export interface AttendanceSummaryRow {
  employeeId: ID;
  employeeName: string;
  daysPresent: number;
  daysAbsent: number;
  daysOff: number;
  totalMinutesLate: number;
  totalOvertimeMinutes: number;
}


  id: ID;
  gradeCode: string;
  gradeName: string;
  minSalary: number;
  midSalary: number;
  maxSalary: number;
  applicablePositions: string;
}

export type AdjustmentType = 'merit_increase' | 'promotion' | 'market_adjustment' | 'annual_increment';
export type AdjustmentStatus = 'pending' | 'approved' | 'rejected' | 'implemented';

export interface CompensationAdjustment {
  id: ID;
  employeeId: ID;
  employeeName: string;
  adjustmentType: AdjustmentType;
  currentSalary: number;
  proposedSalary: number;
  effectiveDate: string;
  justification: string;
  status: AdjustmentStatus;
  requestedBy: string;
  requestedAt: string;
}

// ---------- Claims & Reimbursement ----------

export type ClaimType = 'transportation' | 'medical' | 'meal' | 'training' | 'equipment' | 'other';
export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'reimbursed';

export interface Claim {
  id: ID;
  employeeId: ID;
  employeeName: string;
  department: string;
  claimType: ClaimType;
  description: string;
  amount: number;
  dateIncurred: string;
  dateSubmitted: string;
  status: ClaimStatus;
  attachmentName?: string;
  reviewerNote?: string;
}

// ---------- HMO & Benefits Administration ----------

export type BenefitPlanType = 'hmo' | 'life_insurance' | 'retirement' | 'wellness' | 'other';

export interface BenefitPlan {
  id: ID;
  planName: string;
  provider: string;
  planType: BenefitPlanType;
  coverageAmount: number;
  employerSharePercent: number;
  employeeSharePercent: number;
  isActive: boolean;
}

export type EnrollmentStatus = 'enrolled' | 'pending' | 'waived' | 'terminated';

export interface Dependent {
  id: ID;
  fullName: string;
  relationship: string;
  birthDate: string;
}

export interface BenefitEnrollment {
  id: ID;
  employeeId: ID;
  employeeName: string;
  planId: ID;
  planName: string;
  status: EnrollmentStatus;
  enrollmentDate: string;
  dependents: Dependent[];
}

// ---------- HR Analytics ----------

export interface PayrollCostTrendPoint {
  period: string;
  grossCost: number;
  netCost: number;
  deductions: number;
}

export interface ClaimsByTypePoint {
  claimType: ClaimType;
  totalAmount: number;
  count: number;
}

export interface BenefitsUtilizationPoint {
  planName: string;
  enrolled: number;
  capacity: number;
}

export interface AnalyticsSummary {
  totalPayrollCostThisPeriod: number;
  totalActiveEmployees: number;
  pendingClaimsCount: number;
  benefitsEnrollmentRate: number; // 0-100
  payrollCostTrend: PayrollCostTrendPoint[];
  claimsByType: ClaimsByTypePoint[];
  benefitsUtilization: BenefitsUtilizationPoint[];
}