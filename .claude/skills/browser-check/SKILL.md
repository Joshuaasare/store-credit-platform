# /browser-check

Automate manual visual testing by starting the dev server and verifying it loads correctly.

## When to use

- After implementing a frontend feature to verify it renders.
- When the user says "check the UI", "test the page", or "verify it loads".
- Before declaring a frontend feature complete.
- After running Playwright smoke tests (`nx e2e admin-webapp-vite`).

## Steps

1. Determine which app the user is working on.
   - Ask if ambiguous.
   - Common apps: `admin-webapp-vite`, `student-portal`, `parent-app`, `teacher-app`, `super-admin`.
2. Start the dev server in the background:
   - Web apps: `nx serve [app-name]`
   - React Native: `nx start [app-name]`
3. Wait for the server to be ready:
   - Web: run `.claude/scripts/check-dev-server.sh PORT PATH` (default port 4200, default path `/`, default timeout 60s). It polls until HTTP 200 or timeout and returns JSON.
   - React Native: wait for Metro bundler to report ready.
4. Capture health:
   - For web: confirm the page loads and returns 200.
   - Check for build errors in the terminal output.
5. Report findings:
   - Server status (running / failed)
   - Page load status (200 / error)
   - Any build or console errors observed
6. Clean up: stop the dev server background process.

## Rules

- Always clean up background processes after the check.
- Do not open actual GUI browser windows; use headless checks.
- If the server fails to start, report the error and do not retry automatically.
- For React Native apps, only verify Metro starts.
