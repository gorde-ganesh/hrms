import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
import { successResponse } from '../utils/response-helper';
import { auditLog } from '../utils/audit';
import { prisma } from '../lib/prisma';

const BANK_TRANSFER_DIR = path.join(process.cwd(), 'storage', 'bank-transfers');

async function ensureBankTransferDir() {
  await fs.promises.mkdir(BANK_TRANSFER_DIR, { recursive: true });
}

const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/**
 * Generates a NEFT bulk-upload CSV accepted by most Indian banks.
 *
 * Columns: Sl No | Payment Mode | Amount | Account Type | Account No | IFSC Code | Beneficiary Name | Remarks
 * Payment Mode: N = NEFT
 * Account Type: SB = Savings (default; most salary accounts are savings)
 */
function buildNeftCsv(
  items: { accountNumber: string; ifscCode: string; beneficiaryName: string; amount: any }[],
  month: number,
  year: number,
): string {
  const narration = `SALARY ${MONTH_NAMES[month - 1]} ${year}`;
  const header = 'Sl No,Payment Mode,Amount,Account Type,Account No,IFSC Code,Beneficiary Name,Remarks';
  const rows = items.map((item, i) =>
    [
      i + 1,
      'N',
      Number(item.amount).toFixed(2),
      'SB',
      item.accountNumber,
      item.ifscCode,
      `"${item.beneficiaryName.replace(/"/g, '""')}"`,
      narration,
    ].join(','),
  );
  return [header, ...rows].join('\r\n');
}

// ─── Create Bank Transfer Batch ──────────────────────────────────────────────
export const createBankTransferBatch = async (req: Request, res: Response) => {
  const { month, year } = req.body;
  const companyId = (req.user as any)?.companyId;
  if (!companyId) throw new HttpError(400, 'Company context required', ERROR_CODES.VALIDATION_ERROR);

  // FINALIZED payrolls in this company/month/year with no existing transfer item
  const payrolls = await prisma.payroll.findMany({
    where: {
      month,
      year,
      status: 'FINALIZED',
      employee: { user: { companyId } },
      bankTransferItem: null,
    },
    include: {
      employee: { include: { user: { select: { name: true } } } },
    },
  });

  if (payrolls.length === 0) {
    throw new HttpError(
      400,
      'No finalized payrolls without an existing bank transfer found for this month',
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // Partition into transferable vs. skipped (missing bank details)
  const transferable = payrolls.filter(
    p => p.employee.bankAccountNumber && p.employee.ifscCode,
  );
  const skipped = payrolls
    .filter(p => !p.employee.bankAccountNumber || !p.employee.ifscCode)
    .map(p => ({ employeeId: p.employeeId, name: p.employee.user.name, reason: 'Missing bank account details' }));

  if (transferable.length === 0) {
    throw new HttpError(
      400,
      'All employees are missing bank account details — cannot create batch',
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.bankTransferBatch.create({
      data: {
        month,
        year,
        companyId,
        createdById: req.user?.id,
        items: {
          create: transferable.map(p => ({
            payrollId: p.id,
            amount: p.netSalary,
            accountNumber: p.employee.bankAccountNumber!,
            ifscCode: p.employee.ifscCode!,
            beneficiaryName: p.employee.user.name,
          })),
        },
      },
      include: { items: true },
    });

    await tx.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'BankTransferBatch',
        entityId: created.id,
        performedBy: req.user!.id,
        after: { month, year, itemCount: created.items.length, skipped: skipped.length },
      },
    });

    return created;
  });

  // Generate and persist the NEFT CSV
  await ensureBankTransferDir();
  const csv = buildNeftCsv(batch.items, month, year);
  const fileName = `neft-${batch.id}.csv`;
  const filePath = path.join(BANK_TRANSFER_DIR, fileName);
  await fs.promises.writeFile(filePath, csv, 'utf-8');

  await prisma.bankTransferBatch.update({
    where: { id: batch.id },
    data: { fileUrl: filePath },
  });

  return successResponse(
    res,
    { batch: { ...batch, fileUrl: filePath }, skipped },
    `Bank transfer batch created with ${batch.items.length} item(s)${skipped.length ? `, ${skipped.length} skipped` : ''}`,
    SUCCESS_CODES.SUCCESS,
    201,
  );
};

// ─── Get Bank Transfer Batches ───────────────────────────────────────────────
export const getBankTransferBatches = async (req: Request, res: Response) => {
  const companyId = (req.user as any)?.companyId;
  const { month, year, skip, top } = req.query;

  const [batches, totalRecords] = await Promise.all([
    prisma.bankTransferBatch.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(month ? { month: Number(month) } : {}),
        ...(year ? { year: Number(year) } : {}),
      },
      include: { _count: { select: { items: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
      skip: Number(skip) || 0,
      take: Number(top) || 20,
    }),
    prisma.bankTransferBatch.count({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(month ? { month: Number(month) } : {}),
        ...(year ? { year: Number(year) } : {}),
      },
    }),
  ]);

  return successResponse(res, { content: batches, totalRecords }, 'Data fetched successfully', SUCCESS_CODES.SUCCESS, 200);
};

// ─── Download NEFT CSV ───────────────────────────────────────────────────────
export const downloadBankTransferCsv = async (req: Request, res: Response) => {
  const batchId = req.params.batchId as string;

  const batch = await prisma.bankTransferBatch.findUnique({
    where: { id: batchId },
    include: { items: true },
  });

  if (!batch) throw new HttpError(404, 'Bank transfer batch not found', ERROR_CODES.NOT_FOUND);

  const fileName = `neft-salary-${MONTH_NAMES[batch.month - 1]}-${batch.year}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  // Serve from persisted file when available
  if (batch.fileUrl && fs.existsSync(batch.fileUrl)) {
    fs.createReadStream(batch.fileUrl).pipe(res);
    return;
  }

  // Fallback: regenerate in-memory (e.g. file was purged) and persist for next request
  const csv = buildNeftCsv(batch.items, batch.month, batch.year);
  await ensureBankTransferDir();
  const filePath = path.join(BANK_TRANSFER_DIR, `neft-${batch.id}.csv`);
  await fs.promises.writeFile(filePath, csv, 'utf-8');
  await prisma.bankTransferBatch.update({ where: { id: batchId }, data: { fileUrl: filePath } });
  res.end(Buffer.from(csv, 'utf-8'));
};

// ─── Mark Batch Submitted ────────────────────────────────────────────────────
export const markBatchSubmitted = async (req: Request, res: Response) => {
  const batchId = req.params.batchId as string;

  const batch = await prisma.bankTransferBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new HttpError(404, 'Bank transfer batch not found', ERROR_CODES.NOT_FOUND);
  if (batch.status !== 'PENDING') {
    throw new HttpError(400, `Batch is already ${batch.status}`, ERROR_CODES.VALIDATION_ERROR);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.bankTransferBatch.update({
      where: { id: batchId },
      data: { status: 'SUBMITTED' },
    });

    await tx.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'BankTransferBatch',
        entityId: batchId,
        performedBy: req.user!.id,
        before: { status: 'PENDING' },
        after: { status: 'SUBMITTED' },
      },
    });

    return result;
  });

  return successResponse(res, updated, 'Batch marked as submitted', SUCCESS_CODES.SUCCESS, 200);
};
