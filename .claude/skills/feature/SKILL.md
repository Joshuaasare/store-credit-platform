## Prerequisites

- Before starting, check `.claude/plans/` for an existing plan file for this feature.
- If no plan exists, ask the user to run `/feature-request` to generate one.
- Always refer to the plan file during implementation.

## Implementation Steps

- start with putting together all the types you need for the feature
- Use the database schema in database.types.ts to understand the structure of the data, relationships, and constraints and how we'll be filtering the data from the frontend.
- Always modify backend types in the types folder. Never modify types in the schema folder directly.
- Run yarn:generate-types to generate the corresponding schema files and the fronted types. (NB in the backend you'll be using the types from the schema file and not the direct types)
- DO NOT modify the generated schema files directly. If you need to make changes to the types, always modify the backend types in the types folder and then run yarn:generate-types to update the schema files and frontend types accordingly.
- implement the API endpoints for the feature in the backend and services with pagination and search support.
- For the queries, specify the returned field in QueryFragment const and always use that in the queries to ensure type safety. Never fetch school_id to the frontend.
- Implement the frontend pages similar to how we've done it in the past. With the table showing the data.
- If its a new page, add the page and routes to the appropriate places.
- We always do soft deletion, using the deleted_at timestamp.
  -When fetching data and its relationships, always check that deleted_at for the main item and deleted_at for the relationships is always null.
- During implementation, when deleting, don't use redundant states like isDeleting, or itemToDelete in the frontend. Just use the selectedItem state, and use modes (create, delete, and edit) to show which item to delete and which modal to show. Examples can be found in the AssessmentTypeClientPage.
- In the react-native apps, always use const for component functions. E.g when defining a component, use `const MyComponent = () => { ... }` instead of `function MyComponent() { ... }`.
- In the react-native apps, avoid creating a components folder in the feature folder. Instead, create the components directly in the feature folder. This is to avoid unnecessary nesting and to keep the file structure flat and easy to navigate. Examples can be found in the Home and Attendance features.
- In the react native apps, create default exports instead of named exports for the components. This is to maintain consistency across the codebase and to make it easier to import the components. Examples can be found in the Home and Attendance features.

## Verification Steps

- After implementation, run `/test-affected` to verify no tests are broken.
- After implementation, run `/browser-check` to verify the UI loads correctly.
- Only declare success after both verification steps pass.
