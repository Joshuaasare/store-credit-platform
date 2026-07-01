# /feature-request

Capture feature context with minimal prompting and auto-generate an implementation plan.

## When to use

- When the user describes a new feature or says "I want to build X".
- Before any implementation work begins.
- When the user says "plan this feature" or "how should we build X".

## Steps

1. Ask the user these three questions (one at a time if needed):
   - **Feature name:** A short kebab-case name (e.g., `custom-report`, `attendance-import`).
   - **Apps affected:** Which apps need changes? (API / admin-webapp-vite / student-portal / parent-app / teacher-app / super-admin)
   - **One-sentence description:** What does this feature do?

2. Search the codebase for similar features.
   - Look in `apps/smartschool-api/src/app/routes/` for backend patterns.
   - Look in `apps/admin-webapp-vite/src/app/Pages/` for frontend patterns.
   - Look in `apps/smartschool-api/src/app/types/` for type patterns.
   - Search for tables, components, or services with related names.

3. Ask clarifying questions based on findings:
   - Is this CRUD, analytics/reporting, or a workflow?
   - Which database tables are involved?
   - Is it quantitative (scores/numbers) or qualitative (descriptions/grades)?
   - Does it need a new page or modify an existing one?

4. Generate a plan file at `.claude/plans/[feature-name].md` with this structure:

```markdown
# [Feature Name]

## Context
[Why this feature is needed — 1-2 sentences]

## Backend Changes
1. Types: modify `apps/smartschool-api/src/app/types/[relevant].types.ts`
2. Run `yarn generate:types`
3. Service: add method to `apps/smartschool-api/src/app/services/[relevant].service.ts`
4. Routes: add endpoint to `apps/smartschool-api/src/app/routes/[relevant]/index.ts`

## Frontend Changes
1. Page: create `apps/admin-webapp-vite/src/app/Pages/[path]/[FeatureName].tsx`
2. Table/Columns: create `Columns.tsx` if needed
3. Service: add API call to `apps/admin-webapp-vite/src/app/shared/services/[relevant]Service.ts`
4. Routes: add route in appropriate router file

## Verification
- [ ] Backend endpoint returns expected data
- [ ] Frontend page loads without errors
- [ ] Data flows correctly from API to UI
```

5. Tell the user: "Plan saved to `.claude/plans/[feature-name].md`. Run `/feature-developer` to implement it."

## Rules

- Never skip the search step — finding similar features saves time.
- Keep plans concise but specific enough to execute.
- If the user already has a plan, do not overwrite it without asking.
- Use kebab-case for plan file names.
