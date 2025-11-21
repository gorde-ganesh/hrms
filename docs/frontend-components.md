# Frontend Component Catalog

## Stack Snapshot

- Angular 17 standalone components (`src/app`)
- PrimeNG UI kit + Tailwind utility classes
- Central services: `ApiService` (REST wrapper), `ChatService` (websocket/SSE), `NotificationService` (real-time drawer), `SpinnerService`, `ValidationService`
- Routing defined in `src/app/app.routes.ts` guarded by `AuthGuard`

## Shared Building Blocks

- **Services**: `api-interface.service.ts`, `chat.service.ts`, `notification.service.ts`, `spinner.service.ts`, `error-handler.service.ts`
- **Utilities**: `status.pipe.ts` for Leave/Payroll pills, `form-error.directive.ts`, `table.utils.ts`
- **State**: Session storage stores `authToken` + `userInfo` (permissions, employeeId). Components reference this to filter APIs/permissions.

## Feature Map

| Route                                                  | Component                                           | Status                                                    | Responsibilities                                                                                              | Key APIs / Services                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/login`                                               | `features/login/login.ts`                           | **Complete**                                              | Auth + forgot password flows, remember-me, password reset                                                     | `ApiService` (`/api/auth/login`, `/forgot-password`, `/change-password`)                                         |
| `/`                                                    | `features/layout/layout.ts`                         | **Complete**                                              | Shell with sidebar, permission-aware menu, dark mode toggle, password change dialog, notification drawer slot | `SpinnerService`, `ValidationService`, `ApiService`, `Notifictaion` component                                    |
| `/dashboard`                                           | `layout/dashboard/dashboard.ts`                     | **Mostly Complete** (dummy data for tasks/quick actions)  | Attendance summary, upcoming leaves widget, quick actions                                                     | `ApiService` (`/api/attendance/summary`, `/api/leaves/upcoming`, `/api/attendance`)                              |
| `/attendence`                                          | `layout/attendence/attendence.ts`                   | **Complete** for employee self-service                    | Clock in/out, monthly summary, paginated history                                                              | `ApiService` (`/api/attendance`, `/api/attendance/:employeeId`, `/summary/:employeeId`)                          |
| `/leaves`                                              | `layout/leaves/leaves.ts`                           | **Complete** (manager approvals)                          | Tabs for My Leaves vs Team, apply dialog, manager inline editing                                              | `ApiService` (`/api/leaves`, `/team`, `/status`), `MessageService`                                               |
| `/employees`                                           | `layout/employee/employee.ts`                       | **Advanced**                                              | User registration wizard, employee CRUD, payroll generation launcher                                          | `ApiService` (`/api/employees`, `/api/master-data`, `/api/auth/register`, `/api/payroll`), `ConfirmationService` |
| `/payroll`                                             | `layout/payroll/payroll.ts`                         | **Partial** (component list + payslip DL; generation WIP) | Payslip table, component CRUD, payslip download                                                               | `ApiService` (`/api/payroll`, `/api/payroll/components`), `StatusPipe`                                           |
| `/chat`                                                | `layout/chat/chat.ts`                               | **MVP** (1–1 chats)                                       | Conversation list, ad-hoc chat creation, real-time updates via `ChatService`                                  | `ChatService` (`registerUser`, `getUserConversations`, `startConversation`, `sendMessage`)                       |
| `/performance`                                         | `layout/performance/performance.ts`                 | **Stub**                                                  | Template exists but lacks logic/UI                                                                            | Needs spec + `ApiService` integration                                                                            |
| `/department`                                          | `layout/department/department.ts`                   | **Stub**                                                  | Placeholder component; no UI                                                                                  | Requires CRUD forms tied to `/api/department` endpoints                                                          |
| `/designation`                                         | missing route/component (files exist but not wired) | **Stub**                                                  | Files under `layout/designation` exist but not registered in routes                                           | Add route + integrate with API                                                                                   |
| `/notifications`                                       | Provided via `Notifictaion` child component         | **Complete** for list/drawer                              | Real-time feed, mark read, badge counts                                                                       | `NotificationService` websockets/SSE                                                                             |
| `/reports`                                             | Mentioned in `pageRouteMap`, route missing          | **Gap**                                                   | Need module planning                                                                                          | TBD                                                                                                              |
| `/performance`, `/dashboard`, `/payroll` quick actions | Not linked yet                                      |                                                           | Buttons exist but no navigation handlers                                                                      | Add click bindings                                                                                               |

## Component Notes

- **Layout shell**: builds menu dynamically from `userInfo.permissions`. Password dialog enforces validator parity with backend. Spinner status piped via `SpinnerService.getSpinnerState()`.
- **Employee module**: uses two-step wizard (`registerUserForm` + `addEmployeeForm`). Payroll generation reuses backend default components and calculates net salary client-side for preview.
- **Leaves module**: relies heavily on `status.pipe` for table chips; ensures managers can edit statuses inline with `p-table` row editing.
- **Payroll module**: imports `downloadPayslip` helper from backend controller (should be replaced with service call). Component CRUD respects `permissions.generate`.
- **Chat module**: currently supports 1-1 conversations only; group/channel/huddle support requires backend API extension + UI (multi-user selection, presence, call UI).
- **Notification mini-app**: `Notifictaion` drawer toggled from layout (component load handles socket + SSE). Need consistent spelling for routes/imports (`notifications` vs `notifictaion`).

## Gaps & Follow-up Actions

1. Wire `designation` files into router and build CRUD UI similar to Department.
2. Flesh out `Department` and `Performance` components (forms, tables, charts).
3. Implement Dashboard dynamic data for tasks/quick actions.
4. Extend Chat UI for group/channel creation, call/huddle UX, file attachments.
5. Build Notification center route (beyond drawer) with filters + pagination.
6. Add state management for permissions (avoid repeated `sessionStorage` parsing).
7. Document style guide & theming (PrimeNG + Tailwind interplay) in future iteration.
