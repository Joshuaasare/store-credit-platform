# /test-affected

Run tests only on code affected by recent changes and report failures concisely.

## When to use

- After implementing a feature to verify nothing is broken.
- Before opening a PR to ensure affected tests pass.
- When the user says "run tests" or "check tests".

## Steps

1. Determine the base branch. Default to `develop` unless the user specifies another.
2. Run `nx affected --target=test --base=develop`.
3. Capture stdout and stderr.
4. Parse the output:
   - If all tests pass, print: "All affected tests passed."
   - If tests fail, extract ONLY the failed test names and their error snippets.
   - Group failures by project.
5. Print a concise summary. Do NOT dump the full raw logs unless the user explicitly asks.
6. If failures exist, suggest running the specific failed tests in isolation with: `nx test [project-name] --testPathPattern=[pattern]`.

## Rules

- Never dump full test output by default.
- Focus on actionable failures only.
- If no tests are affected, print: "No affected tests to run."
