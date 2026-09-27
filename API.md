## Pairwise Judging

### Submit Pairwise Comparison

`POST /api/events/{slug}/pairwise`

Allows an assigned judge to compare two submitted projects.

Request body:

```json
{
  "projectAId": "project-id-a",
  "projectBId": "project-id-b",
  "winnerProjectId": "project-id-a",
  "comment": "Project A demonstrated stronger implementation."
}