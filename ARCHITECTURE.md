# Dogfood Platform — Architecture

## Overview

Dogfood is a self-hostable hackathon submission and judging platform designed to run locally with Docker Compose.

## Technology Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod
- JWT-based sessions
- Docker
- Docker Compose

## Core Components

### Frontend

The frontend uses Next.js App Router and React.

Main areas include:

- Event pages
- Project gallery
- Project submissions
- Authentication
- Community voting
- Project comments

### Backend

Backend functionality is implemented through Next.js API routes.

The API handles:

- Authentication
- Events
- Teams
- Projects
- Judges
- Judge assignments
- Rubrics
- Evaluations
- Score normalization
- CSV export
- Community voting
- Comments
- Audit logging

### Authentication and Authorization

Users authenticate with email and password.

A signed JWT is stored in an HTTP-only session cookie.

Supported roles:

- PARTICIPANT
- JUDGE
- ORGANIZER
- ADMIN

Protected API routes enforce role-based authorization on the backend.

### Database

PostgreSQL stores application data.

Prisma manages the database schema and generated client.

Important entities include:

- User
- Event
- Track
- Prize
- Team
- TeamMember
- Project
- Judge
- JudgeAssignment
- Rubric
- RubricCriterion
- Evaluation
- EvaluationScore
- CommunityVote
- ProjectComment
- AuditLog

### Docker Deployment

Docker Compose runs two services:

1. PostgreSQL
2. Next.js application

The application waits for PostgreSQL to become healthy before starting.

On startup the application:

1. Synchronizes the Prisma schema.
2. Seeds demo users.
3. Starts the Next.js production server.

The platform can be started with:

```bash
docker compose up --build