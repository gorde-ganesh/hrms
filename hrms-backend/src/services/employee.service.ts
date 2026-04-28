import { EmployeeStatus, Prisma } from '../../generated/prisma';
import { prisma } from '../lib/prisma';
import { HttpError } from '../utils/http-error';
import { ERROR_CODES } from '../utils/response-codes';
import { notDeleted, softDeleteData } from '../utils/soft-delete';

export interface CreateEmployeeDto {
  userId: string;
  employeeCode?: string;
  departmentId: string;
  designationId: string;
  joiningDate?: string;
  salary: number;
  status?: string;
  managerId?: string;
  dob?: string;
  personalEmail?: string;
  bloodGroup?: string;
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
}

export interface UpdateEmployeeDto extends Partial<Omit<CreateEmployeeDto, 'userId'>> {}

export interface ListEmployeesDto {
  pageno?: number;
  top?: number;
  departmentId?: string;
  designationId?: string;
  status?: EmployeeStatus;
  sortField?: string;
  sortOrder?: string;
  search?: string;
}

export class EmployeeService {
  async ensureUniqueCode(employeeCode?: string, excludeId?: string): Promise<void> {
    if (!employeeCode) return;
    const existing = await prisma.employee.findFirst({
      where: {
        employeeCode: employeeCode.trim(),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new HttpError(400, 'Employee code already exists', ERROR_CODES.VALIDATION_ERROR);
    }
  }

  async create(dto: CreateEmployeeDto) {
    await this.ensureUniqueCode(dto.employeeCode);

    const existing = await prisma.employee.findUnique({ where: { userId: dto.userId } });
    if (existing) {
      return prisma.employee.update({
        where: { id: existing.id },
        data: { status: EmployeeStatus.ACTIVE },
      });
    }

    return prisma.employee.create({
      data: {
        userId: dto.userId,
        employeeCode: dto.employeeCode?.trim(),
        departmentId: dto.departmentId,
        designationId: dto.designationId,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        salary: dto.salary,
        status: (dto.status as EmployeeStatus) || EmployeeStatus.ACTIVE,
        managerId: dto.managerId || null,
        dob: dto.dob ? new Date(dto.dob) : new Date(),
        personalEmail: dto.personalEmail || 'N/A',
        bloodGroup: dto.bloodGroup || 'N/A',
        emergencyContactPerson: dto.emergencyContactPerson || 'N/A',
        emergencyContactNumber: dto.emergencyContactNumber || 'N/A',
      },
    });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new HttpError(404, 'Employee not found', ERROR_CODES.EMPLOYEE_NOT_FOUND);
    }

    await this.ensureUniqueCode(dto.employeeCode, id);

    return prisma.employee.update({
      where: { id },
      data: {
        employeeCode: dto.employeeCode?.trim(),
        departmentId: dto.departmentId,
        designationId: dto.designationId,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
        salary: dto.salary !== undefined ? Number(dto.salary) : undefined,
        status: (dto.status as EmployeeStatus) || EmployeeStatus.ACTIVE,
        managerId: dto.managerId || null,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        personalEmail: dto.personalEmail || 'N/A',
        bloodGroup: dto.bloodGroup || 'N/A',
        emergencyContactPerson: dto.emergencyContactPerson || 'N/A',
        emergencyContactNumber: dto.emergencyContactNumber || 'N/A',
      },
    });
  }

  async softDelete(id: string) {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new HttpError(404, 'Employee not found', ERROR_CODES.EMPLOYEE_NOT_FOUND);
    }
    return prisma.employee.update({
      where: { id },
      data: { status: EmployeeStatus.INACTIVE, ...softDeleteData() },
    });
  }

  async restore(id: string) {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new HttpError(404, 'Employee not found', ERROR_CODES.EMPLOYEE_NOT_FOUND);
    }
    return prisma.employee.update({
      where: { id },
      data: { status: EmployeeStatus.ACTIVE, deletedAt: null },
    });
  }

  async findById(id: string) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true, role: true } } },
    });
    if (!employee) {
      throw new HttpError(404, 'Employee not found', ERROR_CODES.EMPLOYEE_NOT_FOUND);
    }
    return employee;
  }

  async list(dto: ListEmployeesDto) {
    const skip = Math.max(dto.pageno ?? 0, 0);
    const take = Math.min(Math.max(dto.top ?? 10, 1), 100);

    const validSortFields: Array<keyof Prisma.EmployeeOrderByWithRelationInput> = [
      'createdAt', 'joiningDate', 'salary', 'employeeCode',
    ];
    const sortField = validSortFields.includes(dto.sortField as any)
      ? (dto.sortField as keyof Prisma.EmployeeOrderByWithRelationInput)
      : 'createdAt';
    const sortOrder: 'asc' | 'desc' =
      dto.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where: Prisma.EmployeeWhereInput = { ...notDeleted };
    if (dto.departmentId) where.departmentId = dto.departmentId;
    if (dto.designationId) where.designationId = dto.designationId;
    if (dto.status) where.status = dto.status;
    if (dto.search) {
      where.OR = [
        { user: { email: { contains: dto.search, mode: 'insensitive' } } },
        { user: { name: { contains: dto.search, mode: 'insensitive' } } },
        { employeeCode: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [employees, totalRecords] = await Promise.all([
      prisma.employee.findMany({
        where, take, skip,
        orderBy: { [sortField]: sortOrder },
        include: {
          user: { select: { name: true, email: true, role: true } },
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return { content: employees, totalRecords };
  }

  async getSummary() {
    const [totalEmployees, activeEmployees, newEmployees, totalDepartments] =
      await Promise.all([
        prisma.employee.count(),
        prisma.employee.count({ where: { status: EmployeeStatus.ACTIVE } }),
        prisma.employee.count({
          where: {
            joiningDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        prisma.department.count(),
      ]);
    return { totalEmployees, activeEmployees, newEmployees, totalDepartments };
  }

  async getLastEmployeeCode() {
    const last = await prisma.employee.findFirst({
      select: { employeeCode: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!last) {
      throw new HttpError(404, 'Employee code not found', ERROR_CODES.NOT_FOUND);
    }
    return last.employeeCode;
  }
}

export const employeeService = new EmployeeService();
