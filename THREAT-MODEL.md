# Threat Model

## Scope

This threat model covers the self-hosted hackathon submission and judging platform, with particular focus on authentication, role isolation, project submissions, judge assignments, evaluations, community voting, and auditability.

## Assets

- User accounts and sessions
- Participant and judge role permissions
- Hackathon projects and submissions
- Judge assignments
- Rubric criteria and evaluation scores
- Normalized judging results
- Community votes and comments
- Audit logs
- Event and configuration data
- Database credentials and local deployment configuration

## Trust Boundaries

1. Browser/client → Next.js API routes
2. API routes → authentication/session layer
3. API routes → Prisma/PostgreSQL
4. Participant → participant-owned resources
5. Judge → assigned judging resources
6. Organizer/Admin → event and judging administration

## Threats and Mitigations

| Threat | Risk | Mitigation |
|---|---|---|
| Participant accesses organizer/judge endpoints | Unauthorized administrative or judging actions | Server-side `requireRole` checks on protected API routes |
| Judge submits scores for an unassigned project | Manipulated judging results | Evaluation endpoint verifies that the judge has an assignment for the project |
| Participant submits an evaluation | Unauthorized score manipulation | Evaluation creation requires the `JUDGE` role |
| Duplicate evaluation submission | Duplicate or conflicting scores | Database uniqueness constraint on `(judgeId, projectId)` and API conflict handling |
| Invalid or excessive rubric score | Distorted evaluation totals | Server-side validation checks criterion IDs, required criteria, non-negative scores, and maximum scores |
| Client modifies JWT role | Privilege escalation | Session role is re-read from the database rather than trusting the JWT role alone |
| Judge assignment crosses event boundaries | Cross-event judging | Assignment endpoint verifies the judge and project belong to the requested event |
| Non-submitted project is assigned for judging | Invalid judging state | Assignment endpoint only allows `SUBMITTED` projects |
| Duplicate judge assignment | Duplicate judging workload | Unique database constraint on `(judgeId, projectId)` plus API duplicate handling |
| Unauthorized batch assignment | Manipulation of judging workload | Batch assignment requires `ORGANIZER` or `ADMIN` role |
| Assignment changes are not traceable | Weak auditability | Batch assignment creates an `AuditLog` entry |
| Duplicate community vote | Vote manipulation | Unique database constraint on `(userId, projectId)` |
| Excessive community voting | Automated vote abuse | Server-side rate limiting on voting |
| Excessive comment submission | Comment spam | Server-side rate limiting and duplicate-comment checks |
| Participant votes for own project | Self-voting | Voting endpoint rejects votes for the user's own project |
| Submission after deadline | Invalid late submissions | Project submission endpoint checks event deadline/state |
| Duplicate GitHub repository submissions | Reuse of the same repository across projects | Submission endpoint checks existing GitHub repository URLs |
| Unauthorized evaluation normalization | Manipulation of final judging data | Normalization endpoint requires `ORGANIZER` or `ADMIN` |
| Unauthorized evaluation export | Exposure of judging data | Evaluation export endpoint is role protected |
| Database exposure | Disclosure or modification of platform data | Self-hosted deployment keeps PostgreSQL inside the Docker Compose environment and does not require an external hosted database |
| Secrets committed to source control | Credential exposure | `.env` is ignored by Git and runtime secrets are supplied through environment configuration |

## Security Principles

### Server-side authorization

Authorization is enforced in API routes rather than relying on UI visibility. A hidden button is not considered a security control.

### Least privilege

Roles have different capabilities:

- `PARTICIPANT` — registration, teams, submissions, community participation
- `JUDGE` — assigned-project judging
- `ORGANIZER` — event and judging administration
- `ADMIN` — administrative operations

### Defense in depth

Important judging rules are protected through both application validation and database constraints where applicable.

### Auditability

Important actions such as evaluations, community votes, comments, and batch judge assignments create audit records containing the actor, action, entity, and relevant metadata.

### Self-hosted security boundary

The platform is designed to run locally/self-hosted. Operators are responsible for protecting the host, Docker environment, PostgreSQL data, environment secrets, backups, and network exposure.

## Residual Risks

The current implementation does not attempt to provide a complete production security boundary for an internet-facing deployment.

Remaining operational risks include:

- Weak development credentials in the seeded fixture
- Local development `AUTH_SECRET`
- In-memory rate limiting is not suitable for a multi-instance deployment
- Production deployments should use HTTPS
- Operators must secure PostgreSQL and Docker hosts
- Backups and secret rotation are deployment responsibilities
- Additional abuse protection may be required for a public internet deployment

## Security Verification

The project includes automated tests covering authentication and authorization behavior, including:

- Valid and invalid sessions
- Unauthorized access
- Role-based access control
- Database role overriding a stale JWT role
- Evaluation score validation
- Duplicate evaluation protection
- Balanced judge assignment behavior

The Docker deployment is also exercised locally using:

```bash
docker compose up -d --build