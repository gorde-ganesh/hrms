# HRMS

Monorepo (npm workspaces + Turborepo): `hrms-backend` (Express 5, Prisma 6, PostgreSQL, Socket.IO + Redis adapter) and `hrms-ui` (Angular 20 standalone components, PrimeNG, Tailwind). Product and design intent: see `PRODUCT.md`; setup: `README.md`.

## Commands (run from repo root)
- `npm run dev` — both apps via turbo; `npm run typecheck`, `npm run build`
- Backend only: `npx turbo run typecheck --filter=hrms-backend` (this is what CI runs)
- Frontend build: `npx turbo run build --filter=hrms-ui`
- Prisma (in `hrms-backend`): `npm run migrate` (dev migration), `npm run generate`, `npm run seed`
- Prisma client is generated into `hrms-backend/generated/` (gitignored); run `generate` after schema changes or fresh install.

## Layout
- `hrms-backend/src/`: `routes/` → `controllers/` → `services/`, plus `middlewares/`, `schemas/` (zod), `jobs/` (cron), `lib/`, `utils/`. Entry: `main.ts`.
- `hrms-ui/src/app/`: `features/` (per-domain), `services/`, `guards/`, `interceptors/`, `models/`.

## Conventions
- Prettier (`.prettierrc.json`): single quotes, semicolons, 2 spaces, width 80. A hook formats edited files automatically.
- Commits: conventional style, e.g. `fix(chat): ...`, `feat(huddle): ...`.
- Roles: Admin, HR, Manager, Employee — enforce RBAC on the backend, not just in UI guards.
- Real-time features (chat, huddle, notifications) use Socket.IO; clean up room/huddle state on disconnect and member leave, and remember multiple server instances share state through Redis.
- Schema changes: edit `prisma/schema.prisma` and create migrations with `prisma migrate dev`; never hand-edit applied migrations.
- UI must meet WCAG 2.1 AA (see `PRODUCT.md`): keyboard navigable, errors not conveyed by color alone.

## Guardrails (enforced by hooks in `.claude/settings.json`)
Edits are blocked for `.env*` (except `.env.example`), `package-lock.json`, `cert/`, key/cert files, and `prisma/migrations/*.sql`.
