import { prisma } from '../lib/prisma';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES } from '../utils/response-codes';
import { ComponentType, PayrollStatus } from '../../generated/prisma';

export interface PayrollCalculation {
  grossSalary: number;
  netSalary: number;
  lopDeductionAmount: number;
  components: Array<{
    componentTypeId: string;
    amount: number;
    snapshotName: string;
    snapshotType: ComponentType;
    snapshotPercent: number;
  }>;
}

/**
 * Calculate working days for a given month/year (Mon–Sat, 26-day convention).
 * In India, most payroll systems use 26 working days as the denominator.
 */
export function getWorkingDaysInMonth(_month: number, _year: number): number {
  return 26;
}

/**
 * Core payroll calculation. Deterministic — given the same inputs it always
 * produces the same outputs. No side effects.
 */
export async function calculatePayroll(
  employeeId: string,
  month: number,
  year: number,
  lopDays = 0
): Promise<PayrollCalculation> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { salary: true },
  });

  if (!employee) {
    throw new HttpError(404, 'Employee not found', ERROR_CODES.NOT_FOUND);
  }

  if (!employee.salary || Number(employee.salary) <= 0) {
    throw new HttpError(
      400,
      'Employee annual CTC is not configured',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const annualCTC = Number(employee.salary);
  const rawMonthlySalary = annualCTC / 12;

  const workingDays = getWorkingDaysInMonth(month, year);
  const lopDeductionAmount =
    lopDays > 0
      ? parseFloat(((lopDays / workingDays) * rawMonthlySalary).toFixed(2))
      : 0;
  const grossSalary = parseFloat((rawMonthlySalary - lopDeductionAmount).toFixed(2));

  const componentTypes = await prisma.payrollComponentType.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  if (componentTypes.length === 0) {
    throw new HttpError(
      400,
      'No active payroll component types configured. Add components before generating payroll.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  let netSalary = grossSalary;
  const components: PayrollCalculation['components'] = [];

  for (const ct of componentTypes) {
    const pct = Number(ct.percent ?? 0);
    const amount = parseFloat(((pct * grossSalary) / 100).toFixed(2));

    if (ct.type === ComponentType.ALLOWANCE) {
      netSalary = parseFloat((netSalary + amount).toFixed(2));
    } else {
      netSalary = parseFloat((netSalary - amount).toFixed(2));
    }

    components.push({
      componentTypeId: ct.id,
      amount,
      snapshotName: ct.name,
      snapshotType: ct.type,
      snapshotPercent: pct,
    });
  }

  return {
    grossSalary,
    netSalary: parseFloat(netSalary.toFixed(2)),
    lopDeductionAmount,
    components,
  };
}

/**
 * Validate a payroll state transition.
 * Allowed: DRAFT→APPROVED, APPROVED→LOCKED, LOCKED→PAID
 */
export function validateStateTransition(
  current: PayrollStatus,
  next: PayrollStatus
): void {
  const allowed: Record<PayrollStatus, PayrollStatus> = {
    [PayrollStatus.DRAFT]: PayrollStatus.APPROVED,
    [PayrollStatus.APPROVED]: PayrollStatus.LOCKED,
    [PayrollStatus.LOCKED]: PayrollStatus.PAID,
    [PayrollStatus.PAID]: PayrollStatus.PAID,
  };

  if (allowed[current] !== next) {
    throw new HttpError(
      409,
      `Cannot transition payroll from ${current} to ${next}. Expected next state: ${allowed[current]}`,
      ERROR_CODES.INVALID_STATE_TRANSITION
    );
  }
}
