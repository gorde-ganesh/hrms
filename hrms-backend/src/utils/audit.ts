import { Prisma } from '../../generated/prisma';
import { prisma } from '../lib/prisma';

export interface AuditOptions {
  action: string;
  entity: string;
  entityId?: string;
  performedBy: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  ipAddress?: string;
  userAgent?: string;
}

export async function auditLog(opts: AuditOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        performedBy: opts.performedBy,
        before: opts.before ?? Prisma.DbNull,
        after: opts.after ?? Prisma.DbNull,
        ipAddress: opts.ipAddress,
        userAgent: opts.userAgent,
      },
    });
  } catch {
    // Audit failures must not break the main request
  }
}
