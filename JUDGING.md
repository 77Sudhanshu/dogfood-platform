# Dogfood Platform — Judging

## Overview

Dogfood provides a configurable judging workflow for hackathon projects.

The judging system supports:

- Judge registration
- Manual judge assignment
- Balanced batch judge assignment
- Configurable judges per project
- Configurable rubrics
- Weighted scoring
- Evaluation submission
- Judge progress tracking
- Score normalization
- CSV export
- Audit logging

## Judge Assignment

Judges can be assigned to projects for an event.

Assignments determine which projects a judge is authorized to evaluate.

The platform supports:

- Manual judge assignment
- Balanced batch assignment
- Configurable judges per project
- Duplicate assignment prevention

Balanced assignment distributes projects deterministically across the available judges.

The backend verifies the judge's assignment before accepting an evaluation.

Existing assignments are preserved when batch assignment is run again.

## Rubrics

Organizers can configure judging rubrics.

A rubric contains multiple criteria.

Each criterion can define:

- Name
- Description
- Weight
- Maximum score

This allows different hackathons to use different judging structures.

## Evaluations

A judge submits an evaluation for an assigned project.

Each evaluation contains:

- Project
- Judge
- Rubric
- Criterion scores
- Optional comment
- Submission timestamp

The backend validates scores before storing them.

A score cannot exceed the configured maximum score for its criterion.

A judge cannot submit multiple evaluations for the same project.

Evaluation creation, criterion scores, and the corresponding audit record are written transactionally.

## Evaluation Validation

Before an evaluation is stored, the backend verifies:

- The authenticated user has the JUDGE role.
- The judge belongs to the event.
- The project belongs to the event.
- The project has been submitted.
- The judge is assigned to the project.
- The evaluation does not already exist.
- Every submitted criterion belongs to the rubric.
- No criterion is submitted more than once.
- Every rubric criterion is scored.
- Scores are not negative.
- Scores do not exceed the configured maximum.

## Role Isolation

Judging operations are protected by backend authorization.

### Participant

Participants cannot submit judge evaluations or access organizer-only normalization.

### Judge

Judges can access their assigned judging workflow and progress.

Judges cannot access organizer-only normalization or administration endpoints.

### Organizer

Organizers can configure judging and access score normalization and exports.

### Admin

Administrators can access organizer-level judging administration.

## Score Calculation

Each evaluation uses the configured rubric weights.

Criterion scores are normalized against their maximum score and combined according to their configured weights.

The resulting weighted score is represented on a 0–100 scale.

## Score Normalization

The platform provides a judge z-score normalization endpoint.

For each judge, raw weighted scores are standardized using:

```text
z = (rawScore - judgeMean) / judgeStandardDeviation

normalizedScore = 50 + (z × 10)