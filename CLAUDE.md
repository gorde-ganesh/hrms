# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HRMS (Human Resource Management System) is a full-stack monorepo with:
- **`hrms-backend/`** — Node.js/Express + TypeScript + Prisma (PostgreSQL) + Socket.IO on HTTPS port 8080
- **`hrms-ui/`** — Angular 20 standalone components + PrimeNG + Tailwind CSS on port 4200

## Commands

### Backend (`hrms-backend/`)

```bash
bun install                    # Install dependencies (uses Bun, not npm)
bun run main.ts                # Start dev server (HTTPS on localhost:8080)
npm run dev                    # Alternative: nodemon watch mode
bunx prisma migrate dev        # Run pending migrations
bunx prisma generate           # Regenerate Prisma Client after schema changes
npm run seed                   # Seed the database
npm run reset                  # Reset DB and re-run all migrations (destructive)
```

### Frontend (`hrms-ui/`)

```bash
npm install
npm start                      # ng serve (http://localhost:4200)
npm run host                   # ng serve --host 0.0.0.0 (network accessible)
npm run build                  # Production build → dist/
npm test                       # ng test (Jasmine/Karma)
```

## Backend Environment Setup

The backend requires a `.env` file in `hrms-backend/`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/hrms_db"
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="7d"
PORT=8080
HOST=0.0.0.0
NODE_ENV=development
```

SSL certificates must be placed in `hrms-backend/cert/` (git-ignored). The server runs HTTPS using these self-signed certs.

## Architecture

### Backend

**Entry point**: `hrms-backend/main.ts` — creates an HTTPS server, mounts Express routes, and attaches Socket.IO for real-time features (chat, notifications, huddle signaling).

**Request lifecycle**: `JWT auth middleware → route handler (in `src/routes/`) → controller (in `src/controllers/`) → Prisma query → response helper`

**Key conventions**:
- Controllers use `src/utils/response-helper.ts` functions (`success`, `error`, `created`, `noContent`) for all responses
- Throw `HttpError` from `src/utils/http-error.ts` to trigger the centralized error middleware
- All protected routes pass through `src/middlewares/auth.middleware.ts` which injects user context
- RBAC rules live in `src/utils/permission.utils.ts`

**Database**: Prisma schema at `prisma/schema.prisma`. After any schema change: run `bunx prisma migrate dev` then `bunx prisma generate`. Prisma Client is generated into `generated/prisma/` (not committed).

**Real-time (Socket.IO)**: Handlers in `main.ts` cover user online status, 1-1 chat, typing indicators, message read receipts, and huddle/call signaling.

### Frontend

**Entry point**: `hrms-ui/src/app/app.ts` — standalone Angular root component; providers configured in `app.config.ts`.

**Routing** (`app.routes.ts`): All feature routes are lazy-loaded via `loadComponent()`. `AuthGuard` protects every route except `/login`. Default route redirects to `/dashboard`.

**Layout shell** (`features/layout/layout.ts`): Wraps all authenticated pages. Contains the sidebar nav (permission-aware), dark mode toggle, password change modal, and notification drawer. Child pages render in `<router-outlet>`.

**Feature modules** under `features/layout/`: `attendence`, `chat`, `dashboard`, `department`, `designations`, `employee`, `leaves`, `notifictaion`, `payroll`, `performance`.

**Auth state**: JWT token and user metadata (role, permissions, employeeId) are stored in `sessionStorage` as `authToken` and `userInfo`. `api.interceptor.ts` automatically injects the token into every HTTP request.

**Key services**:
- `api-interface.service.ts` — thin HTTP wrapper; set `baseUrl` from environment
- `chat.service.ts` — Socket.IO chat (register, send, receive)
- `notification.service.ts` — real-time notifications
- `spinner.service.ts` / `error-handler.service.ts` — global UX concerns

**UI components**: Use PrimeNG components (Table, Dialog, Button, Calendar, Chart). `MessageService` for toasts, `ConfirmationService` for destructive actions. The `status.pipe.ts` pipe converts leave/payroll status strings to colored chip labels.

**Shared utilities**:
- `src/app/directives/form-error.directive.ts` — inline form error display
- `src/app/utils/table.utils.ts` — PrimeNG table helpers

## Key Docs

- `docs/module-roadmap.md` — feature completion status and known gaps per module
- `docs/backend-schemas.md` — database schema overview and migration timeline
- `docs/frontend-components.md` — component catalog and architecture notes
- `docs/controller-update-guide.md` — backend controller patterns

## Known Incomplete Areas

Several modules are stubs with backend routes but minimal/empty frontend:
- `department`, `designations` — CRUD endpoints exist, frontend not wired
- `performance` — empty stub on both sides
- Chat groups/channels — only 1-1 DMs implemented
- Call/huddle UI — Socket.IO signaling is in `main.ts`, no frontend screens
- Payroll generation form — component not initialized

Email delivery is commented out in `auth.controller.ts`. There is no JWT refresh token mechanism.
