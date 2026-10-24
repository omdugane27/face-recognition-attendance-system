# Face Recognition Student Attendance System — Starter

This is a deployable development scaffold, not a completed biometric product. Face matching and liveness are not enabled; do not infer absence from a failed recognition attempt.

## Stack
- Next.js, React, TypeScript, Tailwind CSS
- FastAPI, SQLAlchemy, PostgreSQL
- Docker Compose

## Local setup
1. Copy `.env.example` to `.env`.
2. Set a long random `JWT_SECRET_KEY` and a strong `POSTGRES_PASSWORD`.
3. Run `docker compose up --build`.
4. Open http://localhost:3000 and API docs at http://localhost:8000/docs.

## Scope
Includes a basic responsive dashboard, API health endpoint, database connection configuration, user model, password hashing/JWT login foundation, and manual attendance API scaffold. This does **not** yet include real face recognition, liveness, institutional CRUD, complete role-based authorization, consent workflows, reports, or production security hardening.

Before real deployment, implement and review consent, retention/deletion, audit logging, tenant isolation, secure browser sessions, MFA, rate limiting, backups, privacy notices, and manual verification alternatives. Never mark a student absent solely because face recognition failed.
