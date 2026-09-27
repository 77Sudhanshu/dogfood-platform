# Architecture

## 1. Overview

Dogfood Platform is a self-hostable hackathon submission and judging platform.

The application is designed to run locally with Docker Compose and uses:

- Next.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Zod validation
- JWT-based sessions
- Docker Compose

The platform follows a modular full-stack architecture where the Next.js application provides both the web interface and server-side API routes.

---

## 2. High-Level Architecture

```text
                    ┌─────────────────────────┐
                    │       Browser/User      │
                    └────────────┬────────────┘
                                 │
                                 │ HTTP
                                 ▼
                    ┌─────────────────────────┐
                    │       Next.js App       │
                    │                         │
                    │  Pages / UI             │
                    │  API Routes              │
                    │  Authentication         │
                    │  Authorization           │
                    │  Validation              │
                    └────────────┬────────────┘
                                 │
                                 │ Prisma
                                 ▼
                    ┌─────────────────────────┐
                    │       PostgreSQL        │
                    │                         │
                    │ Users                   │
                    │ Events                  │
                    │ Teams                   │
                    │ Projects                │
                    │ Judges                  │
                    │ Rubrics                 │
                    │ Evaluations             │
                    │ Votes / Comments        │
                    │ Audit Logs              │
                    └─────────────────────────┘