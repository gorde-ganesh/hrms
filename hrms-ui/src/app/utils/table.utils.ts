import { EmployeeStatus, LeaveStatus } from '../models/global';

export const getSeverityClasses = (status: string | boolean) => {
  switch (status) {
    case LeaveStatus.APPROVED:
    case EmployeeStatus.ACTIVE:
    case true:
      return 'success';
    case LeaveStatus.PENDING:
      return 'warn';
    case LeaveStatus.REJECTED:
    case EmployeeStatus.INACTIVE:
    case false:
      return 'danger';

    default:
      return 'secondary';
  }
};
