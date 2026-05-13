# HRMS Module Completion Roadmap

This roadmap aligns backend (`hrms-backend`) and frontend (`hrms-ui`) work required to finish each module. Each section documents current coverage, known gaps, and concrete tasks. **Last audited: 2026-05-13.**

---

## Registration & Auth

**Current**

- Backend: register/login/forgot/change-password plus JWT issuance and RBAC (`permission.utils.ts`).
- Frontend: login + reset flows (`features/login/login.ts`); employee onboarding in `layout/employee/employee.ts`.

**Gaps**

- Email delivery for temp passwords/reset tokens is commented out (`auth.controller.ts` lines 116-133).
- No JWT refresh-token endpoint; the UI does not handle silent token renewal on expiry.

**Actions**

1. Integrate Nodemailer + SES (or similar); move SMTP secrets to `.env`.
2. Add `POST /api/auth/refresh` endpoint + `api.interceptor.ts` silent-renewal logic.
3. Add audit logs for login attempts and password resets.

---

## Department Module ✅

- Backend CRUD complete (`controllers/department.controller.ts`).
- Frontend UI complete: table with lazy load, add/edit dialog, confirm-delete popup (`layout/department/`).
- Route `/department` registered in `app.routes.ts`.

No further action required.

---

## Designation Module ✅

- Backend CRUD complete (`controllers/designation.controller.ts`).
- Frontend UI complete: table, add/edit/delete with classification field (`layout/designations/`).
- Route `/designations` registered in `app.routes.ts`.

No further action required.

---

## Employee Module ✅

- Backend: full CRUD, pagination, manager relationships, payroll hooks (`employee.controller.ts` + `employee.service.ts`).
- Frontend: multi-step onboarding wizard, employee list with search/filter, edit dialog wired to `PUT /api/employees/:id` using `editingEmployeeId`.

**Remaining gaps**

1. Async validation for unique `employeeCode` and email before submit.
2. Manager select: filter by role=MANAGER and add search.
3. Component tests for wizard steps.

---

## Attendance Module ✅ (partial)

- Backend: clock-in/out, user summary, admin listing (`attendance.controller.ts`).
- Frontend: self-service check-in/out, personal history, team/admin view with filters.

**Remaining gaps**

1. Background job to auto-close open attendance records at end-of-day (set checkout + totalHours).
2. CSV export endpoint (`GET /api/attendance/export`) wired to a Download button in the UI.

---

## Leave Module ✅ (partial)

- Backend: application, approvals, balances (`leave.controller.ts`).
- Frontend: My Leaves table, Team Leaves with inline approvals, Calendar tab using FullCalendar.

**Remaining gaps**

1. Leave balance accrual via scheduled job (currently manual/seeded).
2. Overlap detection in controller before accepting a new request.
3. Trigger `Notification` + optional email on approval/rejection.

---

## Payroll Module ✅

- Backend: generation, payslip download, LOP, bank transfer, salary structure (`payroll.controller.ts`, `payroll-components.controller.ts`).
- Frontend: payslips list, generate tab (single + batch), salary structure management, bank transfer batch, payroll components catalog.

**Remaining gaps**

1. Tax / statutory deductions (PF, ESI) as configurable components.
2. Audit trail of payroll runs.

---

## Performance Module ✅

- Backend: goals & review storage (`performance.controller.ts`).
- Frontend: summary cards, rating-trend chart, review history table, team performance summary, add/edit appraisal dialog (`layout/performance/`).
- Routes: `/performance` registered.

**Remaining gaps**

1. Self-review submission flow (employee adds own goals without needing manager login).
2. Notification when a new review is submitted.

---

## Dashboard Module ✅

- Backend: `/api/dashboard/summary` (role-scoped: ADMIN/HR/MANAGER/EMPLOYEE) and `/api/dashboard/alerts` (`dashboard.controller.ts`).
- Frontend: role-aware widgets, attendance chart, quick-action nav, alerts strip (`layout/dashboard/`).

**Remaining gaps**

1. Cache heavy aggregations (currently un-cached Prisma queries on every page load).
2. Upcoming-leaves widget for MANAGER role.

---

## Notification Module ✅ (partial)

- Backend: send, list (paginated), mark-read, mark-all-read, bulk-send (`notification.controller.ts`).
- Frontend: bell+drawer widget in layout header, full-page `/notifications` route (`notification-page.ts`).
- Real-time: Socket.IO `notification` event pushed to connected client.

**Remaining gaps**

1. Email/SMS fallback for critical events (leave approval, contract expiry).
2. Delivery/read-receipt analytics.

---

## Chat & Call Module (incomplete)

**Current**

- Backend: `chat.controller.ts`, `call.controller.ts`; Socket.IO transport in `main.ts` (1-1 DMs).
- Frontend: Chat component supports 1-1 conversations via `ChatService`.

**Actions**

1. Group channels/named rooms (`Conversation` model needs metadata + roles).
2. Presence indicators, typing status, file uploads.
3. Call/Huddle UI: start/accept/decline via WebRTC + media devices.
4. Audit logs + retention policies.

---

### Execution Order

1. **Auth** — email + token refresh (unblocks automated workflows).
2. **Attendance** — auto-close job + CSV export.
3. **Leaves** — overlap detection + accrual job + approval notifications.
4. **Payroll** — statutory deductions.
5. **Chat/Call** — group channels and huddle UI.
