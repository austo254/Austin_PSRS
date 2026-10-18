# Public Service Request System (PSRS)

**Muranga Exam project** inspired by the usability patterns of modern public-service portals. Citizens report public service problems (broken streetlights, water issues, garbage collection…), track progress, and receive in-app updates; administrators triage, assign, resolve, and analyse requests. **It is not an official government service** and must not be given sensitive real-world data (see the in-app Privacy notice).

## 1. Problem statement
Citizens often have no single place to report local service failures or see whether anyone responded. Administrators lack a consistent record of what was reported, who handled it and how long it took.

## 2. Objectives
Provide one portal to submit and track requests; give administrators a managed workflow with an audit trail; derive service-performance analytics from real data; demonstrate secure, deployable full-stack engineering.

## 3. Scope and limitations
In scope: registration/login, request submission (optional image), workflow, notifications, admin dashboard, analytics, CSV export, category/department management.
Out of scope: email/SMS delivery, payments, native apps, map tiles. See [Known limitations](#18-known-limitations).

## 4. Main features
- Citizen: register/login/logout, profile, report an issue (category, location, description, optional image + optional coordinates), unique tracking reference (`PSRS-2026-000123`), own-requests search/filter/sort/pagination, timeline, comments, reopen a resolved request (within 14 days), notifications.
- Admin: dashboard (totals, resolution rate, average resolution time, 4 Recharts charts), server-side search/filter/sort/pagination, CSV export of the filtered set, status workflow, department/staff assignment, priority triage (Low/Medium/High/Urgent), internal notes vs public updates, per-request audit trail, category & department management.
- Notifications persisted in PostgreSQL with unread count, mark-one / mark-all-read, links to the request.

## 5. Technology stack
| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS 4, Lucide, Recharts, React Router, React Hook Form + Zod, TanStack Query, Sonner toasts |
| Backend | Node.js + TypeScript, Express 5, Zod, Helmet, express-rate-limit, Argon2id, pino |
| Database | PostgreSQL with **Drizzle ORM** and generated SQL migrations |
| Storage | Optional S3-compatible object storage (Cloudflare R2, AWS S3, …) |
| Hosting | Railway (one web service + Railway PostgreSQL) |

> **Deviation from the brief – Drizzle instead of Prisma.** The brief asks for Prisma. Prisma downloads native engine binaries at install/generate time, and that download is blocked in the sandbox this project was built in, so it could not be generated, run or tested there. Drizzle was used instead because it provides the same guarantees the brief cares about (typed, parameterised queries, versioned SQL migrations, transactions) and was fully verified end-to-end. `server/src/db/schema.ts` plays the role of `schema.prisma`; `server/drizzle/` holds the migrations. Porting to Prisma later would only touch the data-access layer.

## 6. System architecture
```mermaid
flowchart LR
  B[Browser - React SPA] -- "HTTPS, cookie session + CSRF header" --> API[Express API /api/v1]
  API --> MW[Helmet, CORS, rate limit, session, CSRF, RBAC, Zod]
  MW --> SVC[Services: requests, workflow, admin, analytics, notifications, audit]
  SVC -- "Drizzle (parameterised SQL, transactions)" --> PG[(PostgreSQL)]
  SVC -- "optional, S3 API" --> S3[(Object storage)]
  API -. "SERVE_CLIENT=true" .-> B
```
In production a single Railway service serves both the API and the built SPA from the same origin, which avoids CORS and third-party-cookie problems.

Code layout:
```
client/src/{components,layouts,pages,features,hooks,services,schemas,types,utils}
server/src/{config,middleware,modules/{auth,requests,admin,categories,notifications,analytics,audit},routes,services,db,utils}
server/drizzle/   SQL migrations        server/tests/   Vitest + Supertest
railway.json      Railway build/deploy  package.json    root scripts
```

## 7. Database
```mermaid
erDiagram
  users ||--o{ sessions : has
  users ||--o{ password_reset_tokens : has
  users ||--o{ service_requests : "submits (citizen)"
  users ||--o{ service_requests : "assigned (staff)"
  service_categories ||--o{ service_requests : classifies
  departments ||--o{ service_requests : "handles"
  service_requests ||--o{ request_status_history : records
  service_requests ||--o{ request_comments : has
  service_requests ||--o{ notifications : triggers
  users ||--o{ notifications : receives
  users ||--o{ audit_logs : performs
  users ||--o{ request_comments : writes
  users ||--o{ request_status_history : "changes status"
```
Key rules: unique `users.email` (case-insensitive) and `service_requests.tracking_reference`; tracking numbers come from a Postgres sequence (safe under concurrency); `restrict` on citizen/category deletes, `cascade` on history/comments/notifications, `set null` for department/staff/audit actor; indexes on status, category, department, submitted date; `users.is_demo` marks seed rows. Status changes, history, notification and audit rows are written in **one transaction** (the request row is locked `FOR UPDATE`).

## 8. Request workflow
```
PENDING ──► IN_PROGRESS ──► RESOLVED (resolution comment required)
   │             │              │
   └─► REJECTED ◄┘              └─► REOPENED (citizen only, within 14 days) ──► IN_PROGRESS | REJECTED
```
Citizens cannot set status fields; the only citizen transition is reopening their own resolved request with a reason. `REJECTED` is terminal. Invalid transitions return 400 from the server regardless of the UI.

Analytics definitions: **Resolution rate** = resolved ÷ (all requests − rejected), 0 when empty. **Average resolution time** = mean of `resolved_at − submitted_at` for currently resolved requests. **Open-request age** = mean age of Pending/In-Progress/Reopened requests.

## 9. Prerequisites
Node.js ≥ 20, npm, PostgreSQL ≥ 14 (local) or Docker.

## 10–12. Local installation, environment, migrations, seeding
```bash
npm run install:all
createdb psrs_dev                       # or any empty database
cp server/.env.example server/.env      # then set DATABASE_URL etc.
cd server
npm run db:migrate                      # apply SQL migrations
npm run db:seed                         # idempotent; dev demo accounts + sample data
npm run dev                             # API on :4000
# second terminal
cd client && npm run dev                # SPA on :5173 (proxies /api to :4000)
```
No local Postgres? `npm run db:local` (in `server/`) starts an embedded one on port 5433 (must run as a non-root user).

Environment variables (`server/.env.example` has all of them, placeholders only):
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Railway injects it) |
| `PORT` | Listen port (Railway injects it); server binds `0.0.0.0` |
| `NODE_ENV` | `development` / `production` / `test` |
| `CLIENT_URL` | Comma-separated allowed browser origins (CORS) |
| `SERVE_CLIENT` | `true` to serve `client/dist` from the API (recommended on Railway) |
| `COOKIE_SAMESITE` | `lax` (same origin) or `none` (separate client/API domains; needs HTTPS) |
| `SESSION_TTL_HOURS`, `SESSION_TTL_REMEMBER_DAYS` | Session lifetimes |
| `UPLOAD_STORAGE_PROVIDER` | `none` (default) or `s3` |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` | S3-compatible storage |
| `UPLOAD_MAX_BYTES` | Max image size (default 5 MB) |
| `PASSWORD_RESET_MODE` | `disabled` (default, honest) or `demo` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | **Required** to seed in production; you choose them |
| `SEED_DEMO_DATA`, `SEED_DEMO_PASSWORD` | Production demo data (off by default) |

Session secrets are not needed: sessions are random 256-bit tokens stored hashed in the database.

## 13–14. Commands and tests
```bash
npm run typecheck        # server + client
npm run build            # client then server
TEST_DATABASE_URL=postgresql://USER:PASS@localhost:5432/psrs_test npm test
```
The server tests run against a real PostgreSQL test database (refuses any database whose name does not contain `test`). They cover registration/duplicate email, login (generic errors), auth and CSRF, cross-citizen access (IDOR), validation, mass assignment, uploads (content sniffing), admin-endpoint blocking, valid/invalid transitions, required resolution comment, transaction rollback, notifications, audit entries, analytics, filtering/sorting/pagination, CSV escaping/injection, and catalogue management. Client tests cover form/image validation.

## 15. Demo accounts (development seed only)
| Role | Email | Password |
|---|---|---|
| Administrator | `admin@psrs.demo` | `DemoAdmin#2026` |
| Administrator (staff) | `staff@psrs.demo` | `DemoAdmin#2026` |
| Citizens | `amina@psrs.demo`, `brian@psrs.demo`, `cynthia@psrs.demo` | `DemoCitizen#2026` |

These are public throwaway credentials for local demos. In production the seed **refuses to run** without `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, and demo citizens/requests are only created with `SEED_DEMO_DATA=true`.

**Suggested walkthrough:** sign in as `amina` → Report an Issue → note the reference. Sign in as `admin` (another browser/private window) → Requests → search the reference → Manage → *Start work* → *Mark as Resolved* (try without a comment first) → return as `amina` to see the timeline, resolution and notifications.

## 16. API overview (`/api/v1`)
- Auth: `POST /auth/register|login|logout`, `GET|PATCH /auth/me`, `POST /auth/forgot-password|reset-password` (only when configured)
- Citizen: `POST|GET /requests`, `GET /requests/summary`, `GET|PATCH /requests/:id`, `GET /requests/:id/history|comments`, `POST /requests/:id/comments|reopen`
- Admin (role `ADMIN`): `GET /admin/requests`, `/admin/requests/export` (CSV), `/admin/requests/:id`, `PATCH …/status`, `PATCH …/assignment`, `POST …/notes`, `GET /admin/analytics/{overview,by-status,by-category,trends}`, `GET /admin/staff`, `GET|POST|PATCH /admin/categories`, `/admin/departments`
- Shared: `GET /categories`, `GET /config`, `GET|PATCH /notifications`, `POST /notifications/read-all`, `GET /api/health`

## 17. Railway deployment
1. Push this repository to GitHub. In Railway: **New Project → Deploy from GitHub repo**. `railway.json` supplies the build (`npm run install:all && npm run build`), start (`npm start`, which applies forward-only SQL migrations and then starts the server) and health check (`/api/health`).
2. **Add PostgreSQL** to the project, then in the web service add the variable `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`.
3. Set variables: `NODE_ENV=production`, `SERVE_CLIENT=true`, `CLIENT_URL=https://<your-service>.up.railway.app`, `COOKIE_SAMESITE=lax`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (a strong password you choose). Railway provides `PORT`.
4. Deploy. Migrations run automatically on every start (forward-only; they never reset data).
5. Seed once from the service shell / `railway run`: `npm --prefix server run db:seed:prod` (add `SEED_DEMO_DATA=true` for sample data for a lecturer demo).
6. **Uploads:** Railway's filesystem is ephemeral, so images need object storage. Create an S3-compatible bucket (e.g. Cloudflare R2), set `UPLOAD_STORAGE_PROVIDER=s3` and the `S3_*` variables, and make the public base URL reachable. Without it the app works normally and explains that photo upload is unavailable.
7. Separate frontend/backend services (optional): build the client with `VITE_API_URL=https://<api-domain>`, set the API's `CLIENT_URL` to the client origin, `SERVE_CLIENT=false`, `COOKIE_SAMESITE=none` (requires HTTPS).

**Troubleshooting**
- *Healthcheck fails*: check the deploy logs; `DATABASE_URL` missing/incorrect is the usual cause (`/api/health` returns 503 when the DB is unreachable).
- *Login works but you are immediately logged out*: cookie/origin mismatch – use same origin (`SERVE_CLIENT=true`) or `COOKIE_SAMESITE=none` over HTTPS and an exact `CLIENT_URL`.
- *403 "CSRF"*: the browser origin is not listed in `CLIENT_URL`.
- *Blank page on refresh of a deep link*: `SERVE_CLIENT` is not `true` or the client was not built.
- *Seed says "refusing"*: set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

## 18. Known limitations
- ORM is Drizzle, not Prisma (see above).
- No email/SMS: notifications are in-app only. Password reset is **disabled by default**; `PASSWORD_RESET_MODE=demo` is an academic fallback that returns a one-time token in the API response for classroom demonstrations; it is refused when `NODE_ENV=production`.
- Image upload needs S3-compatible storage to be configured; it was verified in tests with an in-memory storage stub (content sniffing, size/type limits) and in the "not configured" state, not against a live bucket.
- Optional map integration is limited to optional latitude/longitude fields (no map tiles).
- Notification freshness uses 30-second polling, not websockets.
- The supplied eCitizen screenshots were not available when this was built; the UI follows the written layout/palette description in the brief, not pixel-level references.
- End-to-end browser checks were run manually with Playwright against the live app (see delivery notes); there is no committed E2E suite.

## 19. Security considerations
Argon2id password hashing; HttpOnly + SameSite cookies (`Secure` in production); server-stored hashed session tokens with expiry and logout invalidation; CSRF token + Origin checks on state-changing requests; rate limiting on auth routes and the API; Zod validation of bodies, queries and params; role checks and ownership checks on every handler (IDOR returns 404); mass-assignment protection; Helmet with a CSP; strict CORS; upload type/size/**content** verification; CSV formula-injection neutralisation; React escaping for user text; generic production errors; no secrets or tokens in logs; audit log for administrative actions.

## 20. Future enhancements
Email/SMS providers and verified password reset; Prisma port if required; map picker with OpenStreetMap; SLA timers and escalation; multi-language (English/Kiswahili); committed Playwright E2E suite; per-department staff roles.

---
*Academic demonstration project. Not affiliated with or endorsed by any government.*
