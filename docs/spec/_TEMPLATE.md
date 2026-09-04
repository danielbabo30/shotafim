# Spec: <feature name>

> status: documented · updated: YYYY-MM-DD · owning agent: <domain agent>

## 1. Business purpose
What the feature solves, for whom.

## 2. Roles involved
Which `UserRole`s are involved and what each may do.

## 3. User flow
Step by step, including alternate/error states.

## 4. File map
| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/.../page.tsx` | |
| Component | `src/components/.../*.tsx` | |
| Fetcher | `src/lib/*.ts` | read, wrapped in `cache()` |
| Action | `src/lib/actions/*.ts` | writes to DB |
| API | `src/app/api/.../route.ts` | |

## 5. Data model
Models in `schema.prisma`, key fields, enums, status transitions (from → to → who triggers).

## 6. API contracts
endpoint, method, auth, input/output schema (`src/lib/track/schemas.ts` etc.).

## 7. Guards & permissions
Which guard, where, what happens on failure.

## 8. Known edge cases

## 9. Tech debt / TODOs in code
`file:line` + description.

## 10. Findings for the team lead
Bugs / contradictions / security risks noticed during analysis.
