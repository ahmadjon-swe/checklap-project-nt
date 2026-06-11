# QuizApp

A SaaS exam platform: teachers build tests and groups, students take timed/proctored exams, and results feed analytics. Supports Google OAuth, Telegram notifications, and Stripe/manual subscriptions with feature gating.

Monorepo with a NestJS backend and a Next.js frontend.

## Tech stack

| Layer    | Stack |
|----------|-------|
| Backend  | NestJS, TypeORM, PostgreSQL, JWT auth, Passport (Google OAuth), Stripe, Telegraf, Swagger |
| Frontend | Next.js (App Router), React, Zustand, TanStack Query, Tailwind CSS, Axios |
| Infra    | Docker Compose, nginx, GitHub Actions CI |

## Repository layout

```
.
├── apps/
│   ├── backend/        # NestJS API (modules, entities, migrations, seeds)
│   └── frontend/       # Next.js app (App Router)
├── nginx/              # Reverse-proxy config for production
├── docker-compose.yml      # Full stack: postgres + backend + frontend + nginx
├── docker-compose.dev.yml  # Local dev dependencies
├── DEPLOY.txt          # Full deployment guide (Docker & manual)
└── package.json        # Root scripts that delegate to each app
```

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (or use the provided Docker Compose)
- npm

## Getting started (local)

```bash
# 1. Install dependencies for both apps
npm run install:all

# 2. Configure environment
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
# edit the values — see "Environment" below

# 3. Start PostgreSQL (or point .env at your own)
docker compose -f docker-compose.dev.yml up -d postgres

# 4. Run migrations and seed baseline data (subscription plans, admin user)
npm run migration:run
npm run seed

# 5. Run the apps (two terminals)
npm run dev:backend     # http://localhost:3001/api
npm run dev:frontend    # http://localhost:3000
```

API docs (Swagger) are served at `http://localhost:3001/api/docs` in non-production environments.

## Root scripts

| Command | Description |
|---------|-------------|
| `npm run install:all` | `npm ci` in both apps |
| `npm run dev:backend` / `npm run dev:frontend` | Start one app in watch/dev mode |
| `npm run build` | Build both apps |
| `npm test` | Run the backend test suite |
| `npm run lint` | Lint the backend |
| `npm run migration:run` | Apply pending DB migrations |
| `npm run seed` | Seed baseline data |

Each app also has its own scripts (`npm --prefix apps/backend run ...`).

## Environment

Secrets live in `.env` files that are **git-ignored** — never commit them. Each app ships a committed `.env.example` documenting every variable.

Backend highlights (see `apps/backend/.env.example` for the full list):

- `DB_*` — PostgreSQL connection. In production set `DB_SSL_CA` for verified TLS.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — **must be ≥ 32 chars**; validated at boot.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` — Google OAuth.
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — payments.
- `TELEGRAM_BOT_TOKEN` — optional; the Telegram bot only starts when set.

The backend validates its environment on startup and **fails fast** with a clear message if anything required is missing or a secret is too short.

## Testing

```bash
npm test                      # backend unit tests
npm --prefix apps/backend run test:cov   # with coverage
```

## Health checks

- `GET /api/health` — liveness (process is up).
- `GET /api/health/ready` — readiness; pings the database and returns `503` if it's unreachable.

## CI

`.github/workflows/ci.yml` runs on pull requests: lint, type-check, build, and tests for the backend (against a Postgres service), plus type-check and build for the frontend.

## Deployment

The recommended path is Docker Compose (postgres + backend + frontend + nginx):

```bash
docker compose up -d --build
```

See **`DEPLOY.txt`** for the complete guide, including manual deployment, nginx/TLS setup, and what to clean before transferring the project.

## Security notes

- All secrets are sourced from `.env` (git-ignored); `.env.example` files document the shape.
- Google OAuth tokens are handed off via short-lived httpOnly cookies (exchanged at `POST /api/auth/oauth/session`), never placed in the URL.
- Swagger is disabled in production.
- Production database connections use verified TLS by default.
