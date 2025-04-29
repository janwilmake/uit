# TODO

1. ✅ make it usable and gather early feedback (silently open source it) (TARGET: april 8, 2025)
2. ✅ Rename all of zipobject to uithub. uithub means 'universal information terminal hub'
3. ✅ Let's show some ppl/ais and figure out what to do next! (did this until april 20, 2025)
4. ✅ Deploy to uuithub.com
5. ✅ Announcement (Friday, april 25th, 6PM)
6. `.genignore` and `context.json`
7. Plugins
8. Critical stuff
9. UI enhancement
10. Implement `uithub.otp` and use it in `uithub.ingestzip`
11. Implement `monetaryurl` and use it everywhere

# `.genignore` & `context.json`

It'd be a great way to get a better default filter. It's hard though as we want not to cache too fast.

- uithub should always look for `context.json` and `.genignore` and if they exist, push to the HTML
- By default, `.genignore` file is taken from root of project OR `https://uuithub.com/default.genignore`. This is fetched beforehand in the backend of `uithub` and send along as `?excludePathPatterns`. It is then also provided as `data.excludePathPatternsContent`.
- In the search panel, you should be able click through to add the `.genignore` to the repo. There should be a comment inthere refering to uithub.
- In uithub interface, context options should be easily accessible if the file is present (probably in search tab).
- try contents from https://genignore.forgithub.com/custom/oai__openapi-specification/.genignore and see if that works.
- `uitx .` should take into account `.genignore` and run without internet connection.

# Plugins

- Make `ingestjson.uithub.com` so all the apis make sense!
- Also figure out how to nail navigation.
- Also try the "api" datatype which just passes each file that fits the mediatype to the endpoint according to some convention. ActionSchema!
- Make `domains.json` function
- Add default fetch to try `/archive.zip` if a domain is given that isn't proxied
- ❗️ Plugins: at least the API ones from URL should work! But also the formdata=>formdata should be straightforward to add it in.
- Implement useful plugins!!! Make the footprint of a plugin as simple as possible without loosing capability. E.g. also allow file=>file.
- Add ability to configure a `dev` plugin with cookie for remote development with uithub as DX interface for testing.
- Most interesting plugins: 
  - 1. typedoc or similar
  - 2. llms.txt plugin (just taking markdown)

# LATER

- Nav highlights: make it possible to see search filters in tree as well by moving this logic to the backend.
- Add https://www.simpleanalytics.com event if free plan (**yes, is free**) (see: https://docs.simpleanalytics.com/events/server-side)
- Bug with spaces: https://x.com/janwilmake/status/1898753253988253946

# `explore.js` search examples:

- (If too much code, make this an external HTML page) - Below the search inputs, list a few examples that would change the value of the inputs:
  - only md,mdx
  - omit package-lock.json
  - only ts,js,tsx but omit build
  - regex: only files with hardcoded URLs
  - regex: `import ... from "react"`

# Critical stuff

Fix paymentflow. ❌ Sponsorflare Sponsoring isn't working for new sponsors. Fix this by looking at changes too (or let's move to Stripe?)

# UI Enhancements 

- In `uithub.search` expose whether or not tokens were capped with `maxTokens` or not. Then, In uithub UI (`vscode.html`), add filter warning if tokens were capped that says "apply filters for better results".
- `search.js`: basepath should show up on search to easily remove (maybe should first ensure for a basePath in `window.data`)
- `explore.js`: gray out based by comparing final paths with filetree via `string[].includes`. For this we need the final tree as structured data as well.

# Get response

Could be big; https://github.com/refined-github/refined-github/issues/8423#issuecomment-2834412514 https://x.com/fregante

# Improving the markdown output

- Add `x-filter` and `x-error` type safety to `multipart-formdata-stream-js`
- Add `maxTokens` filter and `basePath` content-filter to `ingestzip`, but ensure it still browses through the pathnames (but skipping content). This is more efficient than doing it later on and will ensure we get the full tree still.
- Add ability to omit filtered files out of the tree when it makes sense (see https://x.com/janwilmake/status/1916841093162831924). Goal would be to get the tree that makes most sense under 10k tokens for any repo, even for bun.
