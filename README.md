# Face Attendance System — Professional Starter

A full-stack starter for a consent-based student attendance platform. This is an implementation foundation, not a finished production biometric system. It includes Next.js, TypeScript, Tailwind, FastAPI, PostgreSQL, SQLAlchemy, Docker Compose, role-checked API routes, and initial tests. Face matching and liveness are intentionally not faked or enabled.

## Run locally
1. Install Docker Desktop/Engine with Compose.
2. Copy `.env.example` to `.env`; set a unique `JWT_SECRET_KEY` and `POSTGRES_PASSWORD`.
3. Set `SEED_ADMIN_EMAIL` and a `SEED_ADMIN_PASSWORD` of at least 14 characters for local demo use.
4. Run `docker compose up --build`.
5. Open frontend at http://localhost:3000 and API docs at http://localhost:8000/docs.
6. Create the local demo administrator with `docker compose exec api python -m app.seed_demo`.

## Scope status
Implemented foundation: login endpoint, password hashing, JWT validation, role dependency, basic session creation/start, manual attendance endpoint, database uniqueness constraint, responsive dashboard shell, login UI, Docker files, CI test workflow.
Not yet implemented: complete institutional CRUD, Alembic migrations, secure HttpOnly browser session flow, MFA, rate limiting, CSRF strategy, biometric enrollment, face model, liveness, reports, notifications, parent/student portals, production deployment hardening. Do not deploy as a production attendance system until these are completed and reviewed.

## Security requirements before production
Use HTTPS, managed secrets, strict CORS, rate limiting, MFA for privileged users, secure HttpOnly cookies or a vetted identity provider, audit logs, encrypted backups, tenant/institution scoping, restore tests, and security monitoring. Keep biometrics separate from profile data and enforce consent, retention, withdrawal, and deletion. Evaluate model licensing, false acceptance/rejection, spoof resistance and subgroup performance. Recognition failure must never automatically mark a student absent; provide manual review and non-biometric alternatives.
