import { z } from 'zod';

export const CreateLeaveSchema = z.object({
  employeeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(1).max(500),
  managerApprovalId: z.string().nullish(),
  leaveType: z.enum(['ANNUAL', 'SICK', 'PERSONAL', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID']),
});

export const UpdateLeaveStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
  approvedBy: z.string().optional(),
  approvedById: z.string().optional(),
});
