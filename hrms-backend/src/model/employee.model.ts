import { Employee } from '../../generated/prisma/client';

export interface PaginatedEmployeeResponse {
  content: Employee[];
  totalRecord: number;
}

export interface EmployeeParams {
  id: string;
}

export const LIST_COLS = [
  {
    label: 'Name',
  },
];
