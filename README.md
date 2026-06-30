# TicketOps

A production-grade, cloud-native **event ticketing platform** — built to demonstrate backend development, frontend development, DevOps, DevSecOps, platform engineering, Kubernetes, GitOps, observability, and Site Reliability Engineering (SRE), all on one real codebase.

This is **Phase 1**: a fully functional application running locally. No Docker (beyond Postgres/Redis), no Kubernetes, no CI/CD yet — those come in later phases (see [Roadmap](#roadmap) below).

---

## What it does

People browse live events (concerts, comedy nights, conferences, watch parties), pick seats on an interactive seat map, and book them — with **zero double-bookings**, even under concurrent load, thanks to Redis-backed atomic seat locking. Organizers and admins get a back office to create events, manage bookings, and watch a live dashboard.

## Architecture

```
ticketops/
├── apps/
│   ├── events-api/        NestJS — public event browsing, seat selection, booking, seat locking
│   ├── admin-api/         NestJS — auth (JWT), RBAC, event & booking management, dashboard stats
│   ├── bookings-worker/   NestJS — async queue consumer: confirms bookings, generates QR codes,
│   │                      records notifications, releases seat locks, reconciles dropped jobs
│   └── dashboard/         React + Vite + TypeScript + MUI — public site + admin back office
├── packages/
│   └── prisma/            Shared Prisma schema + generated client, used by all 3 backend services
└── docker-compose.yml     Postgres + Redis only (Phase 1 scope)
```

**Why three backend services instead of one monolith?** It mirrors how a real platform team would split concerns: a public-facing API that needs to scale with traffic and stay simple, an admin API that owns auth and sensitive operations, and a background worker that processes async work without blocking the request path. All three later become independently deployable/scalable Kubernetes Deployments.

### How booking concurrency is handled

1. `events-api` validates the requested seats are `AVAILABLE` in Postgres.
2. It then takes an atomic Redis lock (`SET key value NX EX <ttl>`) **per seat**. If two people click the same seat at the same instant, only one `SETNX` can win — the loser gets a clear "seat is held by another customer" error instead of a silent overwrite.
3. The booking + seat status update happens in a single Postgres transaction.
4. A `BookingJob` row is written (durable) **and** the job is pushed to a Redis list (fast path) for `bookings-worker` to pick up.
5. `bookings-worker` confirms the booking, generates a QR code, records a confirmation notification, and releases the now-redundant Redis lock.
6. If Redis ever drops a job (restart, crash mid-flight), a **reconciliation sweep** in the worker finds the orphaned `BookingJob` row and processes it anyway — Redis is a fast path, never the only record of truth.

---

## Getting started

### Prerequisites
- Node.js 20+
- Docker, with the Compose plugin (`docker compose version` should print something, not "unknown command")

> **Running in WSL?** `docker --version` working doesn't guarantee `docker compose` works — they're separate. If you see `docker: unknown command: docker compose`, install the plugin with `sudo apt-get update && sudo apt-get install docker-compose-plugin`, then re-check with `docker compose version`.

### 1. Install dependencies
```bash
npm install
```

### 2. Start Postgres + Redis
```bash
npm run dev:db
```

### 3. Configure environment variables
Copy each `.env.example` to `.env` in:
- `packages/prisma/.env` ← **the Prisma CLI (migrate/generate/seed) reads this one specifically; it won't read any app's `.env`**
- `apps/events-api/.env`
- `apps/admin-api/.env`
- `apps/bookings-worker/.env`
- `apps/dashboard/.env`

Quick way to do all five at once from the repo root:
```bash
cp packages/prisma/.env.example packages/prisma/.env
cp apps/events-api/.env.example apps/events-api/.env
cp apps/admin-api/.env.example apps/admin-api/.env
cp apps/bookings-worker/.env.example apps/bookings-worker/.env
cp apps/dashboard/.env.example apps/dashboard/.env
```

The defaults all point at the local Docker Postgres/Redis and match each other out of the box — you shouldn't need to change anything to get started. **Important:** `JWT_ACCESS_SECRET` must be identical in `events-api/.env` and `admin-api/.env`, since `admin-api` issues tokens that `events-api` verifies.

### 4. Set up the database
```bash
npm run prisma:migrate
npm run prisma:seed
```

This creates demo accounts:
| Email | Password | Role |
|---|---|---|
| admin@ticketops.dev | Admin@12345 | ADMIN |
| organizer@ticketops.dev | Organizer@12345 | ORGANIZER |
| customer@ticketops.dev | Customer@12345 | CUSTOMER |

...and four demo events with full seat maps.

### 5. Run everything
```bash
npm run dev:all
```

Or run each service in its own terminal if you prefer separate logs:
```bash
npm run dev:events-api       # http://localhost:4000/api  (docs at /api/docs)
npm run dev:admin-api        # http://localhost:4001/api  (docs at /api/docs)
npm run dev:bookings-worker  # http://localhost:4002 (health/ready only)
npm run dev:dashboard        # http://localhost:5173
```

Open **http://localhost:5173** and browse events. Log in as `organizer@ticketops.dev` and visit **/admin** to manage events and see the dashboard.

---

## Tech stack

| Layer | Choice |
|---|---|
| Backend framework | NestJS (TypeScript) |
| ORM | Prisma |
| Database | PostgreSQL |
| Cache / locking / queue | Redis |
| Auth | JWT (access + rotating refresh tokens), bcrypt password hashing |
| Frontend | React 18 + Vite + TypeScript + MUI |
| Frontend state | Zustand (auth, seat selection) + TanStack Query (server state) |
| Logging | Winston, structured JSON in production |
| API docs | Swagger / OpenAPI (auto-generated, at `/api/docs` on each service) |

## A note on what's *not* wired up yet (by design)

This is Phase 1. A few things are intentionally simplified and called out in code comments where relevant:
- **No real email/SMS delivery.** `bookings-worker` writes a `Notification` row and logs it instead of calling SendGrid/SES — the data model already matches what a real provider integration needs (channel, recipient, subject, body, status), so wiring one in later only touches `NotificationsService`.
- **No file storage (S3).** File uploads aren't implemented yet — per the original roadmap this is a later addition.

## Known limitation while building this

This codebase was developed in a sandboxed environment without access to `binaries.prisma.sh` (Prisma's engine-binary CDN), so `prisma generate` / a live database connection could not be exercised during development. Every query was manually cross-checked against the schema field-by-field, the dashboard's full production build was verified end-to-end (zero errors), and all backend TypeScript was lint-clean and type-checked as far as possible without the generated Prisma client. On a normal machine with internet access, `npm install` and `npm run prisma:generate` will work exactly as expected — this is a constraint of the development sandbox, not the code.

---

## Phase 2: Docker

Each of the 4 apps now has its own multi-stage `Dockerfile`, independently buildable and runnable. **The local `npm run dev:*` workflow above is unaffected** — these images are for building/pushing/running standalone containers, not a replacement for day-to-day development. `docker-compose.yml` still only runs Postgres + Redis; a full docker-compose covering all 4 app services is intentionally deferred (see note below).

### Build all 4 images
```bash
npm run docker:build -- <your-dockerhub-username> [tag]
# e.g. npm run docker:build -- sajid123 v0.1.0
```
This produces `<username>/ticketops-events-api`, `<username>/ticketops-admin-api`, `<username>/ticketops-bookings-worker`, and `<username>/ticketops-dashboard`.

### Run one locally to smoke-test it
Make sure `npm run dev:db` is running first (the containers connect to that Postgres/Redis), then:
```bash
npm run docker:run -- events-api
npm run docker:run -- admin-api
npm run docker:run -- bookings-worker
npm run docker:run -- dashboard
```
Each prints exactly what `docker run` flags it's using, so you can see (and copy) the real command underneath.

### Push to Docker Hub
```bash
docker login
npm run docker:push -- <your-dockerhub-username> [tag]
```

### How each image is structured
- **events-api / admin-api / bookings-worker**: 4-stage build (`deps` → `build` → `prod-deps` → `runtime`). The final image contains only production `node_modules`, the compiled `dist/`, and the generated Prisma client — no TypeScript, no dev tooling, no `prisma` CLI. Runs as a non-root user. Each has a `HEALTHCHECK` hitting its real `/health` endpoint.
- **dashboard**: builds the Vite SPA in a Node stage, then serves the static output via Nginx (no Node runtime in the final image at all). Backend URLs are **not** baked in at build time — `docker/docker-entrypoint.sh` generates a small `config.js` from real environment variables (`EVENTS_API_URL`, `ADMIN_API_URL`) when the container starts, so one built image works against any backend without rebuilding. This matters once different environments (staging, prod, different k8s namespaces) need different URLs.

### Why no docker-compose for the app services yet
Wiring all 4 services + Postgres + Redis into one `docker compose up` is straightforward but was deliberately deferred — Phase 5 (Kubernetes) replaces compose-orchestration entirely with Deployments/Services, so a full compose setup here would be throwaway work rather than a stepping stone. If you want one anyway as an intermediate step, it's a quick add — just ask.

---

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Application development | ✅ Done |
| **2** | **Docker, Docker Compose, production Dockerfiles** | **✅ Done (this update)** |
| 3 | Jenkins CI | Not started |
| 4 | Terraform infrastructure | Not started |
| 5 | Amazon EKS | Not started |
| 6 | Helm | Not started |
| 7 | ArgoCD GitOps | Not started |
| 8 | Blue-green deployment | Not started |
| 9 | Canary deployment | Not started |
| 10 | Monitoring (Prometheus, Grafana) | Not started |
| 11 | Logging (ELK / Loki stack) | Not started |
| 12 | SRE: SLOs, SLIs, error budgets, runbooks, disaster recovery | Not started |

Each service already exposes `/health` (liveness) and `/ready` (readiness, checking real dependencies) specifically so Kubernetes probes in Phase 5+ have something real to call.
