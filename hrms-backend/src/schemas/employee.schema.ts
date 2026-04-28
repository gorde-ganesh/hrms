import { z } from 'zod';

export const CreateEmployeeSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER']),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  address: z.string().min(1),
  state: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  employeeCode: z.string().optional(),
  departmentId: z.string().min(1),
  designationId: z.string().min(1),
  joiningDate: z.string().min(1),
  salary: z.number().positive(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'PROBATION']).optional(),
  managerId: z.string().optional(),
  dob: z.string().optional(),
  personalEmail: z.string().email().optional(),
  bloodGroup: z.string().optional(),
  emergencyContactPerson: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().omit({ password: true });
