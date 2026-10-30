# Healthcare Appointment Management System

Full-stack app for booking and managing patient appointments with doctors.
Patients browse doctors and book 30-minute visits; doctors manage their own
day; an admin manages everything. One login page serves all three roles.

| Layer    | Tech                                   | Port (host) |
|----------|----------------------------------------|-------------|
| Client   | React 19 + Vite, React Router, axios   | 5173        |
| Server   | Node.js + Express 5 (REST over HTTP)   | 5000        |
| Database | MySQL 8.4 (Docker)                     | 3307        |

## Architecture

```
Browser ──HTTP──▶ React (Vite) ──/api proxy──▶ Express API ──mysql2──▶ MySQL
```

The client never talks to MySQL directly. All data goes through the REST API as
JSON over HTTP. In development, Vite proxies `/api` to the server. In the
production image, nginx does the same job.

Authentication is a module inside the same Express app and the same database
(a `users` table); there is no separate auth service.

### Server layers (`server/src`)

```
routes/        URL → middleware → controller wiring (auth/role checks live here)
controllers/   read the HTTP request, shape the HTTP response
services/      business rules (ownership, no double-booking, slot availability)
repositories/  SQL queries only (mysql2 pool or a transaction connection)
validators/    zod schemas for request bodies and query strings
middlewares/   validation, authentication/authorisation, 404 and error handling
config/        env loading and DB connection pool
utils/         ApiError, password/JWT helpers, clinic time, transactions
```

### Client layout (`client/src`)

```
api/               shared axios instance (auth header, 401 handling) and token storage
context/           AuthContext: current user, login/register/logout, session restore
services/          one module per API resource, plus authService
hooks/             useAsync for loading/error/reload state (ignores stale responses)
components/        layout, ProtectedRoute and shared UI (ProfileBand, DayStrip,
                   AppointmentSlip, DoctorVisitList, Toast)
pages/             patient/admin pages; pages/doctor/ is the doctor portal
```

## Getting started

### Option A: everything in Docker

```bash
cp .env.example .env          # then change the passwords and JWT_SECRET
docker compose up --build
```

- App: http://localhost:5173
- API: http://localhost:5000/api/health

### Option B: only MySQL in Docker, run the apps locally

```bash
cp .env.example .env
docker compose up -d mysql

cd server && cp .env.example .env && npm install && npm run dev
cd client && npm install && npm run dev
```

Make sure `DB_USER`/`DB_PASSWORD` in `server/.env` match the root `.env`.

If a value in the root `.env` contains `$`, wrap it in single quotes
(`MYSQL_PASSWORD='pa$word'`), otherwise Docker Compose treats `$name` as a
variable and silently drops it.

### Environment variables (server)

| Variable         | Default  | Notes |
|------------------|----------|-------|
| `JWT_SECRET`     | required | Signs login tokens. Use a long random string; the server won't start without it. |
| `JWT_EXPIRES_IN` | `1d`     | Token lifetime (`1h`, `7d`, ...). There are no refresh tokens: users sign in again after it expires. |
| `CLINIC_TZ`      | `Asia/Colombo` | IANA time zone of the clinic. Decides what "today" is and which slots are in the past, on the server and (via `/clinic/time`) in the client. |
| `DB_*`, `PORT`, `CORS_ORIGIN` |  | As before. |

In Docker these come from the root `.env` (see `docker-compose.yml`).

### Database scripts and resetting

`database/init/*.sql` run once, when the MySQL volume is first created:

- `01_schema.sql` – doctors, patients, appointments
- `02_seed.sql` – sample doctors, patients and appointments, dated relative to `CURDATE()` when the DB is created. MySQL runs in UTC, so near midnight Colombo time these rows can be one day off from the clinic's "today"
- `03_auth.sql` – `users` table and the development accounts below

**Existing setups must reset** to get the `users` table and demo accounts, and
to rebuild the container's `node_modules` volume (otherwise `bcryptjs` and
`jsonwebtoken` are missing inside the server container):

```bash
docker compose down -v && docker compose up --build -V
```

This deletes all data in the database volume.

### Development accounts

Seeded by `03_auth.sql`. **Development only**: delete or change them before
any real deployment.

| Role    | Email                | Password      | Linked to                         | Lands on   |
|---------|----------------------|---------------|-----------------------------------|------------|
| Admin   | `admin@clinic.local` | `Admin@12345` | –                                 | `/`        |
| Patient | `patient@demo.local` | `Patient@123` | Saman Silva (patient 1)           | `/`        |
| Doctor  | `doctor@demo.local`  | `Doctor@123`  | Dr. Anjali Perera (doctor 1)      | `/doctor`  |

The login page has "Sign in as demo patient" and "Sign in as demo doctor"
buttons. New patients can create their own account at `/register`. Doctor
accounts can only be created in the database (insert a `users` row with
`role = 'doctor'` and `doctor_id`, password hashed with bcrypt).

## Using the app

**Patients** (Home, Find a doctor, My visits): browse the directory at
`/doctors`, open a doctor, pick a day and a free 30-minute time
(09:00–17:00), add an optional reason and confirm. Signed-out visitors who
choose a time are sent to sign in and brought back. `/appointments` lists
upcoming and past visits; upcoming ones can be cancelled.

**Doctors** (Today, Schedule, My profile, under `/doctor`): today's visits with
counts, a 15-day schedule, and their own profile. On their own visits they can
confirm or cancel scheduled ones, and cancel confirmed ones or (once they have started) mark them completed or no-show.

**Admin** (Dashboard, Appointments, Doctors, Patients): books for any patient
at any time range, changes any status, deletes appointments, adds doctors and
registers patients.

## API

Base URL: `/api`. Successful responses are `{ "data": ... }`. Errors are
`{ "error": { "message", "details?" } }`. Authenticated endpoints need
`Authorization: Bearer <token>` (from register or login); a missing, invalid
or expired token gives 401, a wrong role 403.

| Method | Path                               | Access | Description |
|--------|------------------------------------|--------|-------------|
| GET    | `/health`                          | public | API + database status |
| GET    | `/clinic/time`                     | public | The clinic's current `{ date, time, timeZone }` (`CLINIC_TZ`); the client uses it for "today" |
| POST   | `/auth/register`                   | public | Create a patient + login in one transaction. Body: `firstName, lastName, email, password, phone, dateOfBirth, gender?`. 201 `{ token, user }`; 409 if the email is taken |
| POST   | `/auth/login`                      | public | `{ email, password }` → `{ token, user }`; 401 "Invalid email or password" |
| GET    | `/auth/me`                         | signed in | Current user (reloaded from the DB) |
| GET    | `/doctors`                         | public | List doctors |
| GET    | `/doctors/:id`                     | public | Get a doctor |
| GET    | `/doctors/:id/availability?date=YYYY-MM-DD` | public | `{ date, doctorId, today, now, slots: [{ startTime, endTime, available }] }`, 30-minute slots 09:00–17:00; `today`/`now` are clinic time |
| POST   | `/doctors`                         | admin  | Create a doctor |
| GET    | `/patients`                        | admin  | List patients |
| GET    | `/patients/:id`                    | admin, or that patient | Get a patient |
| POST   | `/patients`                        | admin  | Register a patient record (no login) |
| GET    | `/appointments`                    | signed in | Filters: `doctorId`, `patientId`, `date`, `status`. Patients only get their own, doctors only their own (forced from the token) |
| GET    | `/appointments/:id`                | signed in | Patients/doctors: own only (403 otherwise) |
| POST   | `/appointments`                    | patient, admin | Patient: `{ doctorId, appointmentDate, startTime, endTime, reason? }` for one free slot; the patient comes from the token and `patientId` is rejected. Admin: must send `patientId`, any time range. 400 for past times, 409 if the doctor's slot overlaps |
| PATCH  | `/appointments/:id/status`         | signed in | Patient: only `cancelled`, own only, and only for an upcoming scheduled/confirmed visit (409 otherwise). Doctor: `confirmed`/`completed`/`no_show`/`cancelled`, own only; `completed`/`no_show` only once the visit has started (409). Admin: any. Reactivating a cancelled/no-show visit re-checks for clashes (409) |
| DELETE | `/appointments/:id`                | admin  | Delete an appointment |

`user` is `{ id, email, role, patientId, doctorId, firstName, lastName }` and
never contains the password hash. Tokens carry `{ sub, role, patientId, doctorId }`.

Booking runs in a transaction that locks the doctor's row, so two people can't
book the same slot at the same moment.

## Testing

Neither test suite needs a database or a running server.

```bash
cd server && npm test     # vitest + supertest
cd client && npm test     # vitest + jsdom + Testing Library
```

- **Server** (`server/tests`): every endpoint through the real Express app
  with supertest; repository modules and `config/db.js` are mocked with
  `vi.mock` (including the transaction connection, to check commit vs
  rollback). Covers success, 400, 401, 403, 404 and 409 cases, role and
  ownership rules, plus unit tests for the slot generator, clinic time zone,
  password and JWT helpers. `tests/setup.js` sets dummy env values before the
  app loads, so your `server/.env` is never used. Date logic uses fake timers.
- **Client** (`client/src/**/*.test.*`): every service function (method, URL,
  params/body and returned data, with `httpClient` mocked), the auth header and
  401 interceptors, login redirects by role, the demo-account buttons,
  `ProtectedRoute` role gating, doctor visit actions and `useAsync`'s
  stale-response guard.

Use `npm run test:watch` in either folder while developing.

## Next steps

- Doctor working hours / days off (slots are currently 09:00–17:00 every day)
- Admin UI for creating doctor accounts
- Rate limiting on login, refresh tokens or server-side session revocation
- Email or SMS reminders
- Audit logging and encryption at rest before storing real patient data (PHI)
