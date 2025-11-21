# Backend Schemas & Migration Catalog

## Stack Snapshot

- ORM: Prisma (`hrms-backend/prisma/schema.prisma`)
- DB: PostgreSQL (`datasource db`)
- Generated client: `hrms-backend/generated/prisma`

## Enums

| Enum               | Values                                                      | Notes                             |
| ------------------ | ----------------------------------------------------------- | --------------------------------- |
| `Role`             | `ADMIN`, `HR`, `EMPLOYEE`, `MANAGER`                        | Access tiers for auth/permissions |
| `LeaveStatus`      | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`              | Workflow state for `Leave`        |
| `AttendanceStatus` | `PRESENT`, `ABSENT`, `HALF_DAY`, `LEAVE`                    | Daily summary on `Attendance`     |
| `EmployeeStatus`   | `ACTIVE`, `INACTIVE`, `ON_LEAVE`, `TERMINATED`, `PROBATION` | Lifecycle for `Employee`          |
| `NotificationType` | `SYSTEM`, `LEAVE`, `PAYROLL`, `PERFORMANCE`                 | Categorises in-app alerts         |
| `ComponentType`    | `ALLOWANCE`, `DEDUCTION`                                    | Classifies payroll components     |

## Core Models

Each section lists required relations and notable fields.

### `User`

| Field                                           | Type                                                                               | Notes                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `id`                                            | `String @id @default(uuid())`                                                      | Primary key (text UUID)                              |
| `name`, `email`, `password`, `phone`, `address` | `String`                                                                           | Email unique; password stored hashed via controllers |
| `state`, `city`, `country`, `zipCode`           | `String`                                                                           | Added in later migrations for address granularity    |
| `role`                                          | `Role`                                                                             | Gatekeeping for middleware                           |
| `resetToken`, `resetTokenExp`                   | optional                                                                           | For password recovery                                |
| Relations                                       | `employee`, `payrolls`, `performance`, `notifications`, approvals, messages, calls | Acts as anchor for almost all modules                |

### `Department`

| Field         | Type                          | Notes        |
| ------------- | ----------------------------- | ------------ |
| `id`          | `String @id @default(uuid())` |
| `name`        | `String @unique`              | Display name |
| `description` | optional                      |
| Relations     | `employees`                   |

### `Designation`

Similar to Department, with optional `classification`. Links to `Employee`.

### `Employee`

| Field                           | Type                                                                                         | Notes                                |
| ------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| `id`                            | UUID text PK                                                                                 |
| `employeeCode`                  | `String @unique`                                                                             | Replaces earlier `employeeId` column |
| `userId`                        | `String @unique`                                                                             | One-to-one with `User`               |
| `departmentId`, `designationId` | optional FKs                                                                                 |
| `managerId`                     | self-reference for hierarchy                                                                 |
| Profile fields                  | `joiningDate`, `salary`, `dob`, `personalEmail`, `bloodGroup`, `emergencyContact*`, `status` |
| Relations                       | `leaves`, `attendance`, `payrolls`, `performance`, `notifications`, `leaveBalance`           |

### `Leave`

Captures request window, reason, status, and pointers to approver/manager via `User`. Indexed on `employeeId` and `status`.

### `LeaveBalance`

Tracks annual allowance per employee; unique on `(employeeId, year)`.

### `Attendance`

Stores aggregated day record with check-in/out, total hours, `AttendanceStatus`, and timestamps.

### `Payroll`, `PayrollComponentType`, `PayrollComponent`

Header-detail structure:

- `Payroll`: unique per employee/month/year, references optional `userId` for processor, sum of components.
- `PayrollComponentType`: master data with `ComponentType`, activation flag, optional `percent`.
- `PayrollComponent`: join table linking payroll runs to component types with unique pair constraint.

### `Performance`

Links `Employee` and `User` (reviewer). Holds goals, rating, comments.

### `Notification`

Connects `Employee` + `User`, tracks `NotificationType`, message, read status.

### Conversations, Messaging & Calls

| Model                | Purpose              | Key Fields                                                           |
| -------------------- | -------------------- | -------------------------------------------------------------------- |
| `Conversation`       | Thread container     | `isGroup`, `name`, `createdById`                                     |
| `ConversationMember` | Membership map       | `userId`, `conversationId`, role                                     |
| `Message`            | Chat payload         | `senderId`, `receiverId`, `messageType`, `fileUrl`, `isRead`         |
| `CallLog`            | Audio/video sessions | `callerId`, `receiverId`, `callType`, `status`, start/end timestamps |

## Migration Timeline

| Folder                            | Theme                               | Highlights                                                                               |
| --------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `20251009095752_init`             | Initial schema                      | Adds base tables, enums, payroll + performance + notification                            |
| `20251009103640_init`             | Payroll component percent           | Moves `percent` onto component rows                                                      |
| `20251010081634_leave_balance`    | Leave balance                       | Adds `LeaveBalance` table                                                                |
| `20251015104927_init`             | UUID + org structure                | Converts PKs to UUID text, adds Department/Designation, richer employee & address fields |
| `20251015111552_init`             | User city                           | Adds `city` column                                                                       |
| `20251015115647_`                 | Employee code                       | Replaces `employeeId` column with unique `employeeCode`                                  |
| `20251016071854_init`             | Attendance cleanup                  | Removes unused `userId` foreign key                                                      |
| `20251016075404_init`             | Notification/Payroll FK adjustments | Temporary removal of `userId` and approval FKs                                           |
| `20251016075705_init`             | FK restoration                      | Reintroduces `userId` columns + foreign keys on Leave/Payroll/Performance/Notification   |
| `20251016123237_payroll_change`   | Percent normalization               | Moves `percent` field from `PayrollComponent` to `PayrollComponentType`                  |
| `20251028094002_rle_update`       | Role enum                           | Adds `MANAGER`                                                                           |
| `20251028123300_attendence`       | Attendance redesign                 | Adds `AttendanceStatus`, check-in/out, totals, timestamps                                |
| `20251029124938_init_chat_schema` | Realtime comms                      | Introduces conversation, message, call log models                                        |

## Observations

- Schema already models every module requested (registration/auth, org structure, attendance, leave, payroll, performance, chat/call, notifications). Implementation gaps likely lie in controllers/routes.
- Migrations show rapid iteration; double-check data backfills when deploying (e.g., Employee required fields, `userId` toggling).
- Chat/call objects exist but controllers/services must be validated for real-time features (Sockets/WebRTC).

## Next Steps

1. Cross-reference controllers/service logic per module to ensure they align with schema (especially new enums/relations).
2. Backfill documentation with example payloads (use `src/docs/swagger.json` as seed).
3. Validate migration sequencing in CI/CD; run `prisma migrate status` before release.
