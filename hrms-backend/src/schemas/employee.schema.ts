import { z } from 'zod';

export const CreateEmployeeSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER']),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  address: z.string().min(1),
  state: z.string().nullish(),
  city: z.string().nullish(),
  country: z.string().nullish(),
  zipCode: z.string().nullish(),
  employeeCode: z.string().nullish(),
  departmentId: z.string().min(1),
  designationId: z.string().min(1),
  joiningDate: z.string().min(1),
  salary: z.number().positive(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'PROBATION']).nullish(),
  managerId: z.string().nullish(),
  dob: z.string().nullish(),
  personalEmail: z.string().email().nullish(),
  bloodGroup: z.string().nullish(),
  emergencyContactPerson: z.string().nullish(),
  emergencyContactNumber: z.string().nullish(),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().omit({ password: true });
