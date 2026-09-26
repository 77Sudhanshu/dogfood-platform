# Dogfood Platform — Judging

## Overview

Dogfood provides a configurable judging workflow for hackathon projects.

The judging system supports:

- Judge registration
- Judge assignment
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

The backend verifies the judge's assignment before accepting an evaluation.

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

## Score Normalization

The platform provides a judge z-score normalization endpoint.

The normalization process standardizes raw weighted scores across judges to reduce differences in judging scale.

Normalization is restricted to organizers and administrators.

## Judge Progress

The progress endpoint provides information about a judge's evaluation workload, including assigned projects and completion information.

## CSV Export

Organizers and administrators can export evaluation results as CSV.

The export includes:

- Project name
- Project slug
- Judge name
- Judge email
- Raw score
- Submission timestamp
- Judge comment

## Audit Trail

Important judging actions are recorded in the audit log.

Evaluation submission records include information such as:

- Action
- Evaluation ID
- Actor
- Project
- Judge
- Score count

Community voting and project comments are also recorded for traceability.

## Judging Integrity

The judging backend enforces:

- Role-based authorization
- Judge/project assignment checks
- Score validation
- Duplicate evaluation prevention
- Audit logging
- Organizer-only normalization
- Organizer/admin-only score export