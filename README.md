# Dogfood Platform

A self-hostable hackathon submission and judging platform built for the Dogfood 2026 hackathon.

The platform supports event management, teams, project submissions, judge assignment, rubric-based evaluation, score normalization, CSV export, community voting, comments, audit logging, and role-based access control.

## Tech Stack

- Next.js 16
- TypeScript
- Prisma ORM
- PostgreSQL 17
- Zod
- JWT-based sessions
- Docker Compose
- Vitest

## Core Features

### Authentication & Roles

Four application roles are supported:

- `PARTICIPANT`
- `JUDGE`
- `ORGANIZER`
- `ADMIN`

Authorization is enforced server-side in API routes.

The current session role is also checked against the database rather than trusting only the role stored in the session token.

### Event Management

- Event creation
- Event lifecycle/status
- Tracks
- Prizes
- Teams
- Team invitations
- Project submissions
- Submission deadlines

### Project Submissions

- Draft/edit workflow
- Team ownership validation
- One project per team
- Submission deadline enforcement
- GitHub repository duplicate detection
- Public project gallery
- Project search

### Judging

- Judge registration and assignment
- Manual judge assignment
- Balanced batch judge assignment
- Configurable judges per project
- Duplicate assignment protection
- Rubric criteria with configurable weights
- Server-side score validation
- Duplicate evaluation protection
- Judge progress tracking
- Weighted scoring
- Cross-judge z-score normalization
- CSV evaluation export

### Judging Integrity

The platform protects the judging workflow through:

- Backend role isolation
- Judge/project assignment checks
- Event boundary checks
- Required rubric criteria validation
- Maximum/minimum score validation
- Database uniqueness constraints
- Transactional evaluation creation
- Audit logs
- Balanced assignment algorithm
- Normalization utilities with automated tests
- Pairwise comparison validation
- Duplicate pairwise comparison protection
- Pairwise audit logging

Batch assignment actions are recorded in the audit log using:

```text
BATCH_JUDGE_ASSIGNMENT