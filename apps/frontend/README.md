# CheckLab — Frontend

Next.js 16 (App Router) web app for the CheckLab online exam platform.

## Development

```bash
# create .env.local:
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local

npm install
npm run dev
```

Open http://localhost:3000. The backend must be running on port 3001
(see `apps/backend`).

## Build

```bash
npm run build && npm start
```

Production deployments build via the `Dockerfile` (standalone output);
see `DEPLOY.txt` at the repo root.

## Structure

- `app/` — pages (App Router): `(public)` auth pages, `admin/`, `teacher/`, `student/`
- `components/` — shared UI + layout (`auth/route-guard.tsx` gates protected areas)
- `lib/` — API client (axios), i18n
- `store/` — Zustand stores (auth, exam, theme, premium, sidebar)
- `types/` — shared TypeScript types
- `proxy.ts` — pre-render redirect for unauthenticated users (Next 16 proxy convention)
