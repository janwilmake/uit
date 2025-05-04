# TODO

1. ✅ make it usable and gather early feedback (silently open source it) (TARGET: april 8, 2025)
2. ✅ Rename all of zipobject to uithub. uithub means 'universal information terminal hub'
3. ✅ Let's show some ppl/ais and figure out what to do next! (did this until april 20, 2025)
4. ✅ Deploy to uuithub.com
5. ✅ Announcement (Friday, april 25th, 6PM)
6. ✅ Nailing omni-compatible navigation
7. ingest plugins
8. ❗️ Stability
9. npmjs.com domain
10. merged source
11. xymake zips
12. `.genignore`
13. `context.json`
14. agent-friendly middleware
15. Implement `uithub.otp` and use it in `uithub.ingestzip`
16. Implement `monetaryurl`, pluggable into `sponsorflare` and `stripeflare`, and use it everywhere

^^^ This can still take several weeks to make good. Target: end of may ^^^

# Github URL structure

- keen out the url structure of github and which ones i can support easily
- improve github url parsing `github.ts` for issues/pulls/etc I need to alter what the basepath becomes.
- ensure https://uuithub.com/facebook/react/issues/17473 makes `17474` the basepath of the source that is `issues`
- in https://cache.forgithub.com/owner/repo/issues|discussions|pulls ensure to respond with a file object and present every thread as JSON and MD.
- Do the same for https://log.forgithub.com making these paths available.
- Fix actions.forgithub.com (or remove for now)
- Improve threads.forgithub.com (one file per thread)
- Confirm all visible plugins are functional!!!
- Improve error handling; If plugin returns 404/500, show that error in the same interface.

Share with the world: node_modules, dependencies, issues, discussions, etc etc etc (Can pretty much do one, every day)

# plugin monetisation incentivization

Come up with a good way for any plugin to provide FREEMIUM functionality.

- how old is the data, is the data fresh?
- is there a better version of the same data? if so, how can it be made available?

The plugin should return one of these in response headers:

- Age
- Date
- Last-Modified
- ETag
- Link header (RFC 8288)
- Warning header (RFC 7234) - https://datatracker.ietf.org/doc/html/rfc7234#section-5.5

Maybe I could do it by just adding a README file (or similar) to the files for any ingest plugin. For a transformation plugin, a README.md or WARNING.md file can be added as well. This should get a special place in the UI. For example, we can

# Stability

In `outputmd`, add the params that were used to search as frontmatter. Also, add warning to the top if tokens were capped.

`outputjson` should take request.body as possible way of input (JSON output should work)

`?accept=multipart/Form-Data` should render HTML

Ensure we get the default branch for any github repo from a KV.

We don't get the size of filtered out files. Ensure we still get this (keep content-size header alive). When filtering out files in `ingestzip`, ensure original filesize is preserved.

`search.js`: basepath should show up on search to easily remove

Bug with spaces: https://x.com/janwilmake/status/1898753253988253946

Add https://www.simpleanalytics.com event if free plan (**yes, is free**) (see: https://docs.simpleanalytics.com/events/server-side)

🤔 Review it: What prevents me from hosting this at uithub.com with uuithub.com being the public staging environment that can be unstable? I just made it possible to vary between `wrangler deploy` and `wrangler deploy --production`. Prod can still break when editing sub-services though, so this is difficult.

# `transform-formdata` plugins

- Should already work.
- Make this work for SWC + parsing as primary example.
- The dream: have all source-context for every codefile bound to the file (e.g. as a giant comment)

# `npmjs.com` domain

- ✅ create `ingesttar` and npmjs domain binding to `uithub`
- ✅ add npmjs.com into domains; `npmjs.ts` should route to the appropriate package
- ✅ Make `domains.json` function
- ✅ confirm I can get packages by changing from npmjs url structure to uuithub.com/npmjs.com/...
- make it work without version (resolve dist/latest)
- make it work for subfolders
- make filters work. seems non-responsive
- just redirect npmjz.com to uuithub.com/npmjs.com/...

Share with the world: npmjz 2.0

# Merged source

GOAL: Resolver of github OR npm repos based off `package.json` in a repo.

- Source1: npm.forgithub.com --> dependencies: `(repositoryUrl | packageUrl)[]`
- Document how to use `uithub` as API or make `uitx` package already
- Create a merger that uses source of uithub itself in parallel, and outputs `FormData` for an applied filter on every repo/package.
- BONUS: for repo urls we'd want to use the sha closest to the releasedate (or tag-based) so the source is correct

This would allow getting original source files for all packages, applying a search over each in a fast way. Super dope. If this works, I can apply the same concept for `awesome` repos as well as `lists`.

Share with the world: all js/jsx/ts/tsx for all dependencies.

THIS IS THE FUTURE.

FOCUS on these merged sources:

- dependencies
- lists
- awesome repos
- popular
- Symbolic + semantic + LLM search to select repos about a topic

After that, create a multi-step pruning workflow that makes most sense.

# xymake zips

Fastest way to get FREE one-time package for anyone else after oauth

Fastest way to get FREE one-time package for yourself after oauth

Ensure to add monetisation URL to x router; `premiumUrl` which would allow setting scopes for regeneration.

THIS IS HOW I MAKE MONEY.

# `transform-file` plugins

Also try the `transform-file` datatype which just passes each file that fits the mediatype to the endpoint as long as its content match the schema (if present). ActionSchema! This is tricky when doing this as a URL pipe, but can be done using `transformfile.uithub.com/{endpointurl}`. At some point we're gonna have to pass more parameters to it though, but this could be done using OTP.

Maybe also needs to be https://transformfile.uithub.com/{openapiUrl}/{operationId}

Similarly, maybe ingest plugins need openapi+operation (to know output type beforehand, to know if a plugin is another source)

# generate `.genignore` files

Can be done based on filetree and the default genignore with max certain maxtokens. Can be done using deepseek or cloudflare-based model. Can be done on-demand, stored in KV.

Fix paymentflow. ❌ Sponsorflare Sponsoring isn't working for new sponsors. Fix this by looking at changes too (or let's move to Stripe?)

Put sponsorflare in front, require signin, require balance > -1.

⏳ **Ongoing**: response and/or issue/pr for other providers to also support `.genignore` rather than just `.{platform}ignore`. 🟢 repoprompt. 🟠 repomix. 🟠 gitingest. 🟠 cursor. (RESEARCH OTHERS)

# `context.json`

Separate requests in `filter.js` that looks for `context.json` in current branch and if it exists, render questions. Add `filter.js` tab!

In uithub, magic filter that creates path filters, and fills into search and localStorage.

From filter page, if filter is applied, add button `Add to context.json` that adds copies full `context.json` or one item into clipboard, then navigates to edit/create that file (depending if it pre-existed).

If no filter is applied, add button to generate custom `context.json`

https://contextjson.com/owner/repo: Separate tool to generate a new `context.json` based on tree+README (https://uuithub.com/owner/repo?pathPatterns=README.md), and add to your project via github.

# The "agent-friendly" convention + middleware

Besides `llms.txt`, a `tree.json` file seems useful, not to put in your repo, but to be served at your website itself. In the end, it can be a convention + a middleware that serves all these things, all using the uithub API + caching based on last deployment date.

- tree.json
- llms.txt
- llms-full.txt
- .genignore
- context.json
- `.well-known/*`
- archive.zip
- archive/{contextId}.zip

Any server that exposes this sourcecode-based middleware (setting env of sha at deploy-time) is much more agent-friendly with a single LOC, and can be accessed through uuithub.com/{domain} with all search abilities there!

# `uithub.otp`

# `monetaryurl`

# Dataset

After this is there, and after I have proper categorisation, create a set of datasets with the most useful data around github repos, organised per repo.

- popular python
- popular node
- popular cloudflare
- janwilmake
- etc.

These datasets should be able to be downloaded directly as zip from some page.
