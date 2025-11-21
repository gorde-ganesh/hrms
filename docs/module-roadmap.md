# HRMS Module Completion Roadmap

This roadmap aligns backend (`hrms-backend`) and frontend (`hrms-ui`) work required to finish each module described in `hr.plan.md`. Each section documents current coverage, major gaps, and concrete implementation tasks.

## Registration & Auth

**Current**

- Backend: `src/controllers/auth.controller.ts` implements register/login/forgot/change password plus JWT issuance and role-based permissions (leveraging `utils/permission.utils.ts`).
- Frontend: `features/login/login.ts` provides login + reset flows; employee onboarding is driven from `layout/employee/employee.ts`.

**Gaps**

- Email delivery for temp passwords/reset tokens commented out (`auth.controller.ts` lines 116-133).
- Session lifecycle: tokens expire after 1h but UI does not refresh/handle expiry.
- Registration flow couples User + Employee create; there is no standalone admin UI for user invites without full employee record.

**Actions**

1. Integrate email/SMS provider (e.g., Nodemailer + SES) and move secrets to `.env`.
2. Add refresh-token endpoint + interceptor (`api.interceptor.ts`) to renew silently.
3. Split onboarding wizard so HR can save a draft user, then complete employee data later (requires nullable fields + status).
4. Add audit logs for login attempts and password resets.

## Department Module

**Current**

- Backend CRUD ready (`controllers/department.controller.ts`, `routes/department.route.ts`).
- Frontend component exists but empty (`layout/department/department.ts`).

**Actions**

1. Build UI: table + modal form using PrimeNG table/dialog; hook APIs `/api/department`.
2. Add validation/error states via `FormErrorDirective`.
3. Integrate with `master-data` endpoint so other components (Employee, Leaves) auto-refresh when departments change.
4. Add tests (Jest for controller, Jasmine for component).

## Designation Module

**Current**

- Backend: `controllers/designation.controller.ts` parallels department.
- Frontend: files exist under `layout/designation` but route not registered.

**Actions**

1. Add route entry in `app.routes.ts`.
2. Implement component UI similar to Department (list + add/edit dialog).
3. Expose `designation` data from `master-data` controller after updates.
4. Write E2E scenario covering designation creation and usage during employee onboarding.

## Employee Module

**Current**

- Backend: `employee.controller.ts` covers CRUD, pagination, manager relationships, payroll hooks.
- Frontend: robust wizard (`layout/employee/employee.ts`) with registration + payroll preview; uses `/api/employees`, `/api/auth/register`, `/api/master-data`.

**Gaps & Actions**

1. **Validation/UX**: Add async validators for unique `employeeCode` & email before submit; show spinner feedback.
2. **Editing**: Use dedicated `PUT /api/employees/:id` (currently points to logged-in user). Fix payload to send targeted employee ID.
3. **Manager selection**: Filter by role=MANAGER; add search.
4. **Payroll generation**: Move logic from Employee component to Payroll module to avoid duplication.
5. **Testing**: Add component tests for wizard steps and service mocks.

## Attendance Module

**Current**

- Backend: `attendance.controller.ts` exposes clock-in/out, user summary, admin listing.
- Frontend: `layout/attendence/attendence.ts` and dashboard summary consume `/api/attendance`.

**Actions**

1. Implement manager/admin attendance view with filters (currently only self-service).
2. Add background job to auto-close open attendance (set checkout & totalHours).
3. Enforce geolocation/IP capture if required.
4. Provide export/report endpoints (CSV) and wire to UI.

## Leave Module

**Current**

- Backend: `leave.controller.ts` handles application, approvals, balances.
- Frontend: Leaves component includes My/Team tabs with inline approvals.

**Actions**

1. Generate calendar view (PrimeNG `FullCalendar`) for better visualization.
2. Extend notifications so approvals trigger `Notification` + optional email (ties into Notification module tasks).
3. Automate leave balance accrual via scheduled job.
4. Write policies (max days, overlapping detection) in controller validations.

## Payroll Module

**Current**

- Backend: `payroll.controller.ts` + `payroll-components.controller.ts` implement generation, payslip download, component CRUD.
- Frontend: Payroll component lists payslips and component catalog; employee wizard can trigger payroll.

**Gaps & Actions**

1. Replace direct import of backend helper in `layout/payroll/payroll.ts` with service call; move file download logic to `ApiService`.
2. Complete payroll generation UI (form currently uninitialized) for HR role, including selection of employee, month, custom components.
3. Surface payroll status & net salary summary in Dashboard.
4. Add tax calculations and statutory deductions (PF/ESI) as configurable components.
5. Provide audit trail of payroll runs.

## Performance Module

**Current**

- Backend: `performance.controller.ts` includes goals & review storage.
- Frontend component is empty stub.

**Actions**

1. Design UI for goal setting, review cycles, rating sliders.
2. Support role-based views (self vs manager vs HR).
3. Add notifications when reviews submitted.
4. Build reporting charts (distribution, trends) using PrimeNG charts.
5. Create unit tests for controller scoring logic.

## Dashboard Module

**Current**

- Frontend compiles attendance summary + placeholders for tasks/actions.
- Backend lacks dedicated dashboard endpoint; data pulled from other controllers individually.

**Actions**

1. Build `/api/dashboard` aggregator returning attendance, upcoming leaves, pending approvals, notifications.
2. Replace placeholder tasks/quick actions with live data.
3. Add role-based widgets (HR metrics vs employee).
4. Cache heavy metrics for performance.

## Chat & Call Module

**Current**

- Backend: `chat.controller.ts`, `call.controller.ts` rely on conversation/message/call tables; real-time transport unspecified.
- Frontend Chat component supports 1-1 conversations through `ChatService`; no call UI.

**Actions**

1. Implement WebSocket/WebRTC server (e.g., Socket.IO) for messaging + huddles; document protocol.
2. Extend UI for group channels & named channels (update `Conversation` model with metadata & roles).
3. Add presence indicators, typing status, file uploads.
4. Build Call/Huddle UI with start/accept/decline flows using media devices.
5. Add audit logs + retention policies.

## Notification Module

**Current**

- Backend: `notification.controller.ts` sends/reads notifications; `utils/notification.ts` includes helpers.
- Frontend: `Notifictaion` drawer subscribes to service; no dedicated route.

**Actions**

1. Implement server push (WebSocket/SSE) from notification service; ensure leave/payroll/performance events emit events.
2. Build `/notifications` route for full list, filters, pagination.
3. Add email/SMS fallbacks for critical events (leave approval, huddles).
4. Track delivery/read receipts and expose analytics.

---

### Execution Order Suggestion

1. Stabilize **registration/auth** (tokens + email) to unblock all modules.
2. Finish **Department/Designation** UIs (small scope, unlocks Employee CRUD).
3. Harden **Employee/Attendance/Leave** (core HR ops).
4. Complete **Payroll** and **Dashboard** integrations.
5. Build **Performance** features.
6. Expand **Chat/Call/Notification** for collaboration features.

Coordinate each step with documentation updates (`docs/backend-schemas.md`, `docs/frontend-components.md`) to keep knowledge current.
