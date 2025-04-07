# TODO

🤔 I feel like nerding out on this a bit and showing some love to my users... I still receive all my praise for uithub, nothing else. Let's keep working on it and make it an even better foundation!

1. make it usable and gather early feedback (silently open source it) (TARGET: april 8, 2025)
2. feature parity with v1
3. deploy/transition (TARGET: april 18, 2025)
4. rename all of zipobject to uithub. uithub means 'universal information terminal hub'
5. make it better, adding lots of new features.

# Refactor: direct link to pipe (2025-04-07)

To make it all run a bit easier, uithub should directly call the pipechain via `urlPipe`.. Refactor this so it does.

# Provide default branch for github repos (2025-04-07)

Non-'main' default-branch repos should be navigated properly. For this we must somehow retrieve the default branch or head sha without slowing things down. This info is available in the zip as the first folder is always: `[repo]-[branchOrSha]`. Let's get this in a response header from tree.

This fixes navigation from https://new.uithub.com/brunabaudel/brunabaudel.github.io and any other master default branched repos.

# Add max-token cap warning

In `uithub.search` expose whether or not tokens were capped with `maxTokens` or not.

In uithub UI, add filter warning if tokens were capped that says "apply filters for better results".

# Search/pipe backend

- Add stop criterium if there was one or more basePaths. if so, get last basePath alphabetically and stop after the pathname is behind this one. Will be GREAT for performance for large repos. Best make this a configuration though as it may not always be possible to rely on this!
- Test glob patterns and ensure exlclude is applied after include
- Test search and isRegex
- Things aren't SUPER fast now. See where in the pipeline I can improve performance. Ensuring applying path filters early is especially a good way.

I want things to be FAST. it should especially be fast skipping over files we don't need such as binary and files for which the path doesn't match.

# Navigation

vscode.html

- `maxTokens` input should update on submit
- allow setting `maxFileSize` similarly
- Add https://www.simpleanalytics.com event if free plan, or add back google analytics (see: https://github.com/janwilmake/uithub.v1)

explore.js

- navigation path-clicks should keep rest of query
- navigation greying out isn't fully correct right now.

# `search.js`

Get the search spec and remake `search.js`. Can be done using prompt completely.

- Populate search from and to URL
- Changing URL contents should add them to URL history but not refresh page yet
- Enter in any field should apply URL
- When history has been altered but page not refreshed yet, an 'search' should appear.
- When there are search filtered applied. A 'clear' button should be enabled that clears all search filters.
- Searchbar always have path filters open

Follow up:

- (If too much code, make this an external HTML page) - Below the search inputs, list a few examples that would change the value of the inputs:
  - only md,mdx
  - omit package-lock.json
  - only ts,js,tsx but omit build
  - regex: only files with hardcoded URLs
  - regex: `import ... from "react"`

# POC before LONDON

- ✅ easy login
- ✅ https://new.uithub.com/owner/repo has new layout
- never hit white screen, 404/429/402 if needed
- way to find other plugins for codebase and use them
- xymake for repo being one of them (x.uithub.com) - should return actual posts context in md format!

# TODO before launch

- monkey test and try to find regressions
- create test on speed with top 100 repos and try to find any regressions
- support ouptutjson
- support outputyaml
- go over current api and see what is missing still for this to go live.

# -----BONUS-----

# Add shadow navigation

Should be added to uithub data so the UI makes navigation easy!

# Monaco

Maybe looks way cooler than raw text! However, may also be much harder to make that stream in... Let's see.

# Improve

- search
- outputmd
- merge
- github-url-coverage

# Performance

🟠 Keep watching ratelimiter speed. Sorta slow sometimes, maybe ratelimt resets too fast which causes required reinitialisation which takes a bit longer?

# User onboarding XYMAKE by cheap `archive.zip`

When a user signs up for the first time, put them into a queue that builds `archive.zip` at https://xymake.com/[username]/archive/refs/heads/main.zip

The user should immediately see links to their last 20 posts on /dashboard and a link to `archive.zip` with loading indicator.

This archive should contain just the 20 last posts (with comments) of the user and some other details that can be easily found. It should cap if there are more comments than 20 to a post.

It should have a message at the end saying `visit xymake.com/pricing` to build a better context for [username] AT EVERY CONTEXT, at the end.

Archive can be downloaded directly or viewed with the uithub viewer: https://uithub.com/xymake.com/[username]

# Some bugs

- exclude-dir bug: https://x.com/jhogervorst/status/1900128634926514640
- Ensure the thing doesn't crash when files are empty (or other reasons), and never outputs incorrect JSON
- Bug with spaces: https://x.com/janwilmake/status/1898753253988253946

## Filter

- ✅ Add filter icon to sidebar that opens modal `/filter.js` which shows templated messages that, when clicked, will filter the repo files based on that.
- Make https://filter.zipobject.com work.
- Instead of filter.forgithub.com directly, use API for it with loading indicator.

## OPEN SOURCE

- ✅ renamed repo and Cleaned up repo + README - remove history and make open source.
- Make uithub open source - this is just the place for issues, it's not about the code per se.
- Think about open sourcing zipobject as well. my moat is the domain name and community - not the knowledge of how it works! Another moat could become the cache.
- Share longform how I made uithub/zipobject faster and cheaper in technical blogpost.

# MVP

- Binary urls for private repos: These should not use the raw.githubusercontent, but rather `zipboject.com/file`. Either that or ensure its clear how to access with raw.githubusercontent. can still be done with api key i guess and maybe it's just best.
- Ensure zipobject doesn't cache private repos! This may be a challenge. How to know this!? Is private repo zip location different?
- Public repos is as cheap as possible (see cost vercel), private repos cost is 10x (profit is here). We can do this if we add a `x-is-private-resource` response header.

# uithub as API product

- Provide programmatic way to login and get API key, and document this in the OpenAPI. It's probably good to add this into sponsorflare as well.
- Provide programmatic way to retrieve usage and show this in a table on per-month basis as well as last 14 days on a per-day basis in a graph.
- Provide ability to create/rotate api key, and ensure the api key is not the same as the key you login with, but a key specifically made for API use.

After this is there, this'd be a great thing to show to people, as a minimal example of how to build a paid API with Cloudflare.

# `/file` endpoint

Make https://file.zipobject.com work, or zipobject.com/file (to get a specific file)

`/file` was an endpoint that used a responded with a single file. Was needed for githuq/githus to show the file in the right mediatype, hence `mime-types` package. Should be a zipobject feature, especially cool with range request.

In forgithub.context, it should be called when page is `blob`, but in zipobject it's a separate endpoint.

In forgithub.context, proxy `owner/repo/blob/...` to `/file`.

Blobs support in uithub!

# Get back to users after launch

https://x.com/janwilmake/status/1895375026939142292
