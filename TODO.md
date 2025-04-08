# TODO

🤔 I feel like nerding out on this a bit and showing some love to my users... I still receive all my praise for uithub, nothing else. Let's keep working on it and make it an even better foundation!

1. make it usable and gather early feedback (silently open source it) (TARGET: april 8, 2025)
2. feature parity with v1
3. deploy/transition (TARGET: april 18, 2025)
4. rename all of zipobject to uithub. uithub means 'universal information terminal hub'
5. make it better, adding lots of new features.

# Refactor: direct link to pipe (2025-04-07)

✅ To make it all run a bit easier, uithub should directly call the pipechain via `urlPipe`.. Refactor this so it does.

# Provide default branch for github repos (2025-04-07)

✅ Non-'main' default-branch repos should be navigated properly. For this we must somehow retrieve the default branch or head sha without slowing things down. This info is available in the zip as the first folder is always: `[repo]-[branchOrSha]`. Let's get this in a response header from tree.

✅ This fixes navigation from https://new.uithub.com/brunabaudel/brunabaudel.github.io and any other master default branched repos.

# `search.js`

Get the search spec and remake `search.js`. Can be done using prompt completely.

- Populate search from and to URL
- Changing URL contents should add them to URL history but not refresh page yet
- Enter in any field should apply URL
- When history has been altered but page not refreshed yet, an 'search' should appear.
- When there are search filtered applied. A 'clear' button should be enabled that clears all search filters.
- Searchbar always have path filters open.

# Search/pipe backend

- Test glob patterns and ensure exclude is applied after include
- Test search and isRegex

# UI/UX

vscode.html

- `maxTokens` input should update on submit
- allow setting `maxFileSize` similarly
- Add https://www.simpleanalytics.com event if free plan, or add back google analytics (see: https://github.com/janwilmake/uithub.v1)

explore.js

- navigation path-clicks should keep rest of query
- navigation greying out isn't fully correct right now.

# POC before LONDON

- ✅ easy login
- ✅ https://new.uithub.com/owner/repo has new layout
- search is the biggest feature missing
- never hit white screen, 404/429/402 if needed
