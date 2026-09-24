import { X, Printer } from 'lucide-react';
import type { Payslip, PayrollRun } from '../../types';
import { formatDate } from '../../utils/format';
import { amountToWords } from '../../utils/amountToWords';

interface PayslipDocumentProps {
  payslip: Payslip;
  run: PayrollRun;
  onClose: () => void;
}

const COMPANY_NAME = 'Archon Nell Incorporated';

/** Plain comma-formatted number, no currency symbol — matches the reference slip. */
function n(value: number): string {
  return value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A line item: dash when zero, parentheses when a deduction, plain number otherwise. */
function LineValue({ value, deduction }: { value: number; deduction?: boolean }) {
  if (value === 0) return <span>-</span>;
  return <span>{deduction ? `(${n(value)})` : n(value)}</span>;
}

function Row({ label, value, deduction, indent }: { label: string; value: number; deduction?: boolean; indent?: boolean }) {
  return (
    <div className={`flex justify-between py-px text-[10.5px] leading-tight ${indent ? 'pl-6' : ''}`}>
      <span className="text-ink-900">{label}</span>
      <span className="text-ink-900">
        <LineValue value={value} deduction={deduction} />
      </span>
    </div>
  );
}

function Subtotal({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-0.5 text-[10.5px] font-semibold leading-tight text-ink-900">
      <span>{label}</span>
      <span>{n(value)}</span>
    </div>
  );
}

function SlipBody({ payslip, run }: { payslip: Payslip; run: PayrollRun }) {
  return (
    <div className="border border-ink-900 px-4 py-3 text-ink-900">
      <p className="text-center text-sm font-bold">Pay Slip</p>
      <p className="mt-0.5 text-[10.5px] leading-tight">{COMPANY_NAME}</p>
      <p className="text-[10.5px] leading-tight">
        For the Period {formatDate(run.payPeriodStart)} to {formatDate(run.payPeriodEnd)}
      </p>

      <div className="mt-1.5 flex items-start justify-between text-[10.5px] leading-tight">
        <span>
          Name: <span className="ml-1">{payslip.employeeName}</span>
        </span>
        <span>Employee No.: {payslip.employeeNumber ?? '—'}</span>
      </div>

      <div className="mt-1.5 border-t border-ink-900 pt-1">
        <Row label="Basic Salary" value={payslip.basicPay} />
        <p className="pt-0.5 text-[10.5px] leading-tight">Add(Deduct):</p>
        <Row indent label="Tax Refund" value={payslip.taxRefund} />
        <Row indent label="SL - Cash Conversion" value={payslip.slCashConversion} />
        <Row indent label="Overtime (Reg OT/Sun OT/Hol-ND OT)" value={payslip.overtimePay} />
        <Row indent label="(Absent/Undertime/Lates)" value={payslip.lateUndertimeAbsenceDeduction} deduction />
        <div className="border-t border-ink-900 pt-0.5">
          <Subtotal label="Total Salary" value={payslip.totalSalary} />
        </div>

        <p className="pt-1 text-[10.5px] leading-tight">Less:</p>
        <Row indent label="SSS" value={payslip.sssContribution} deduction />
        <Row indent label="Philhealth" value={payslip.philHealthContribution} deduction />
        <Row indent label="HDMF" value={payslip.hdmfContribution} deduction />
        <div className="border-t border-ink-900 pt-0.5">
          <Subtotal label="Taxable Salary" value={payslip.taxableSalary} />
        </div>

        <p className="pt-1 text-[10.5px] leading-tight">Less:</p>
        <Row indent label="Withholding Tax" value={payslip.withholdingTax} deduction />
        <Row indent label="Cash Advance" value={payslip.cashAdvance} deduction />
        <Row indent label="SSS Loan" value={payslip.sssLoan} deduction />
        <Row indent label="HDMF Loan" value={payslip.hdmfLoan} deduction />
        {payslip.companyLoanDeduction > 0 && (
          <Row indent label="Company Loan" value={payslip.companyLoanDeduction} deduction />
        )}
        <div className="border-t border-ink-900 pt-0.5">
          <Subtotal label="Net Salary" value={payslip.netSalary} />
        </div>

        <p className="pt-1 text-[10.5px] leading-tight">Add:</p>
        <Row indent label="Transportation Allowance" value={payslip.transportationAllowance} />
        <Row indent label="Rice Subsidy Allowance" value={payslip.riceSubsidyAllowance} />
        <div className="flex justify-between border-t border-ink-900 pt-0.5 text-[10.5px] font-bold leading-tight">
          <span>Total Remittance</span>
          <span>Php{n(payslip.totalRemittance)}</span>
        </div>
      </div>

      <p className="mt-1 text-[9px] italic leading-tight text-ink-500">{amountToWords(payslip.totalRemittance)}</p>
    </div>
  );
}

function SlipStub({ payslip, run }: { payslip: Payslip; run: PayrollRun }) {
  return (
    <div className="border-x border-b border-ink-900 px-4 py-2.5 text-[10.5px] leading-tight text-ink-900">
      <div className="flex items-start justify-between">
        <span>
          Name: <span className="ml-1">{payslip.employeeName}</span>
        </span>
        <span>Employee No.: {payslip.employeeNumber ?? '—'}</span>
      </div>
      <p className="mt-0.5">
        For the Period {formatDate(run.payPeriodStart)} to {formatDate(run.payPeriodEnd)}
      </p>

      <div className="mt-3 flex justify-end">
        <div className="text-center">
          <div className="mb-1 h-6 border-b border-ink-900" style={{ width: '180px' }} />
          <p className="text-[9px]">Received By</p>
        </div>
      </div>
    </div>
  );
}

export function PayslipDocument({ payslip, run, onClose }: PayslipDocumentProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 px-4 py-8 print:static print:bg-white print:px-0 print:py-0">
      <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none">
        {/* Toolbar — hidden when printing */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 print:hidden">
          <h2 className="text-base font-semibold text-ink-900">Pay Slip</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-navy-800"
            >
              <Printer size={15} />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-ink-500 transition hover:bg-sand-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable document */}
        <div id="payslip-print-area" className="overflow-y-auto bg-sand-50 px-8 py-8 print:overflow-visible print:bg-white print:px-10 print:py-6">
          <div id="payslip-sheet" className="mx-auto max-w-md bg-white font-serif">
            <SlipBody payslip={payslip} run={run} />
            <SlipStub payslip={payslip} run={run} />
          </div>

          <p className="mt-4 text-center text-xs text-ink-300 print:hidden">
            This is a system-generated payslip for {run.cutoffLabel}.
          </p>
        </div>
      </div>

      <style>{`
        @page {
          size: 4.25in 5.5in;
          margin: 0.25in;
        }
        @media print {
          html, body { height: auto; }
          body * { visibility: hidden; }
          #payslip-print-area, #payslip-print-area * { visibility: visible; }
          #payslip-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          #payslip-sheet {
            zoom: 0.9;
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
