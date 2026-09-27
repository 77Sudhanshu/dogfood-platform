# Dogfood Platform — Data Model

## Overview

The platform uses PostgreSQL with Prisma ORM.

## Core Entities

### User

Stores authenticated users.

Important fields include:

- id
- name
- email
- passwordHash
- role

Roles:

- PARTICIPANT
- JUDGE
- ORGANIZER
- ADMIN

### Event

Represents a hackathon event.

An event contains:

- name
- slug
- status
- dates
- tracks
- prizes
- community voting configuration

### Track

Represents an optional event track.

A track belongs to an event and can contain submitted projects.

### Prize

Represents a prize configured for an event.

### Team

Represents a participant team.

A team can contain multiple team members and can submit a project.

### TeamMember

Connects users to teams and stores their team role.

### Project

Represents a hackathon submission.

A project belongs to an event and team.

Important project information includes:

- name
- slug
- description
- repository URL
- demo URL
- video URL
- status
- track

### Judge

Connects a user with the judging role to judge-specific event participation.

### JudgeAssignment

Connects judges to projects for an event.

Assignments control which projects a judge can evaluate.

### Rubric

Represents a judging rubric for an event.

A rubric contains configurable criteria.

### RubricCriterion

Represents an individual scoring criterion.

Criteria define:

- name
- description
- weight
- maximum score

### Evaluation

Represents a judge's evaluation of a project.

An evaluation belongs to:

- a project
- a judge
- a rubric

An evaluation contains the judge's comment and submitted scores.

### EvaluationScore

Stores the score assigned to an individual rubric criterion.

### CommunityVote

Stores a participant's community vote for a project.

A unique constraint prevents the same user from voting for the same project more than once.

### ProjectComment

Stores comments made by participants on public projects.

Comments are associated with both the author and project.

### AuditLog

Stores important platform actions for traceability.

Examples include:

- community vote creation
- project comment creation
- evaluation submission

## Relationships

The main relationships are:

```text
Event
├── Tracks
├── Prizes
├── Teams
├── Projects
├── Judges
└── Rubrics

Team
├── TeamMembers
└── Project

Project
├── Evaluation
├── CommunityVotes
└── ProjectComments

Judge
├── JudgeAssignments
└── Evaluations

Rubric
└── RubricCriteria

Evaluation
└── EvaluationScores

User
├── TeamMembers
├── Judge
├── CommunityVotes
├── ProjectComments
└── AuditLogs