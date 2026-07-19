# /DRY-checker

Check whether there are any utility functions that are repeatedly scattered across the codebase and put them in a relevant [content].utils.ts (e.g date.utils.ts, ui.utils.ts,storage.utils.ts,misc.utils.ts) file in the shared/utils directory of the project.

## when to use

- After implementing a feature
- After making changes to a feature

## Steps

1. Go through all the changes made or the codebase
2. Identify if there are similar functions that perform the same action but are duplicated across the codebase. You can also check if there are any functions that looks more like utility functions, and are most likely to be reused in other places.
3. Migrate them to a utils file.
