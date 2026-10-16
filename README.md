# UniConnect

University communication platform. Everything runs in one Next.js process:

- **Pages** (App Router) for the four roles: admin, lecturer, student-affairs officer, student
- **REST API** under `/api/*` (route handlers, MongoDB-backed)
- **Realtime** via Socket.IO on the same port (Socket.IO is attached to the custom
  server in `server.mjs`; route handlers publish events through `lib/realtime/emit.ts`)

The only external service is MongoDB (run it via Docker).

## Requirements

- Node.js 20+
- Docker (for MongoDB)
- npm

## First-time setup

```bash
npm install
cp .env.local.example .env.local   # then edit SESSION_SECRET (any long random string)
npm run db:up                      # start the uniconnect-mongo container (port 27017)
npm run seed                       # seed users, staff, students, courses, …
npm run dev                        # http://localhost:3000
```

`npm run seed` is idempotent — it upserts by natural keys and can be re-run any time.

### Database scripts

| Command | What it does |
|---|---|
| `npm run db:up` | Start the Mongo container (no-op if already running) |
| `npm run db:down` | Stop the container (volume `uniconnect_mongo` keeps data) |
| `npm run db:shell` | Open a `mongosh` shell against the app database |
| `npm run seed` | (Re)seed all collections |

## Development / production

```bash
npm run dev     # dev server (Turbopack) with Socket.IO
npm run build   # production build (run `npm run db:up` first)
npm start       # production server
npm run lint    # ESLint
```

Both `dev` and `start` run `node server.mjs`, which hosts Next.js **and** Socket.IO
on port 3000. Do not use `next dev`/`next start` directly — sockets would not attach.

## Demo logins

All demo accounts are created by the seed (`scripts/seed.mjs`):

| Role | Email | Password |
|---|---|---|
| Admin | `nyiminyan0099@gmail.com` | `@dmin123` |
| Lecturer / staff | `dawmya@gmail.com` (any seeded `@gmail.com` staff) | `ucstgo@2026` |
| Student | `kyawthu100@gmail.com` (any seeded student) | `ucstgo@2026` |

## Architecture notes

- **Auth**: httpOnly JWT session cookie (`uniconnect_session`, 30 days). The same
  cookie authenticates the Socket.IO connection; clients join `user:<email>`,
  `role:<role>` and `global` rooms automatically and `conversation:<id>` /
  `generation:<id>` / `lobby:<id>` rooms on demand.
- **Realtime events**: catalogue in `lib/realtime/events.ts`; server emitters in
  `lib/realtime/emit.ts` (no-ops when the socket server is absent, e.g. during
  `next build`). Timetable-specific events go through `lib/timetable-realtime.ts`.
- **Files**: uploads are stored on local disk (`UPLOAD_DIR`, default `./uploads`)
  and served through the session-gated `/api/files/[...path]` route.
- **Data**: Mongo collections and helpers in `lib/mongo.ts`; canonical row shapes
  in `lib/types.ts`; academic lookups/DTO mappers in `lib/academic.ts`.
- Client data access lives in `lib/hooks.ts` (REST + Socket.IO hooks) and
  `components/shared/api.ts` (academic API wrappers).

## Project layout

```
server.mjs                 # custom Next.js + Socket.IO server
scripts/seed.mjs           # Mongo seed (idempotent)
scripts/db.mjs             # docker helpers (db:up / db:down / db:shell)
app/                       # pages + /api route handlers
components/                # role dashboards + shared UI
lib/                       # auth, mongo, storage, hooks, realtime, academic helpers
uploads/                   # local file storage (gitignored)
```
