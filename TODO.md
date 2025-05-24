`&basePath=`

# TODO

1. ✅ make it usable and gather early feedback (silently open source it) (TARGET: april 8, 2025)
2. ✅ Rename all of zipobject to uithub. uithub means 'universal information terminal hub'
3. ✅ Let's show some ppl/ais and figure out what to do next! (did this until april 20, 2025)
4. ✅ Deploy to uuithub.com
5. ✅ Announcement (Friday, april 25th, 6PM)
6. ✅ Nailing omni-compatible navigation
7. ✅ ingest plugins
8. ✅ npmjs.com domain
9. ❗️ Navigation
10. ❗️ Stability. Goto prod?
11. Fix ingestzip for wikizip
12. Merged source
13. xymake zips
14. `.genignore`
15. `context.json`
16. agent-friendly middleware
17. Implement `uithub.otp` and use it in `uithub.ingestzip`
18. Implement `monetaryurl`, pluggable into `sponsorflare` and `stripeflare`, and use it everywhere

^^^ This can still take several weeks to make good. Target: end of may ^^^

# Navigation improvements

- In router, calculate source URL so it is used as button
- On frontend, use fork icon for source and provide rounded token number
- In router, allow providing `more tools` url. if not, no 'more tools' button.
- 🤔 It'd be interesting to be able to determine all possible pages for a particular domain, or at least, some. For example, to easily navigate up from a repo source to the owner source. This may even be a part of the navigation, rather than repos.

# Stability

- In `outputmd`, add the params that were used to search as frontmatter. Also, add warning to the top if tokens were capped.
- When generating full markdown-tree, also get token size for each file/folder, and show the size on folders
- `outputjson` should take request.body as possible way of input (JSON output should work)
- `?accept=multipart/Form-Data` should render HTML
- Ensure we get the default branch for any github repo from a KV.
- We don't get the size of filtered out files. Ensure we still get this (keep content-size header alive). When filtering out files in `ingestzip`, ensure original filesize is preserved.
- `search.js`: basepath should show up on search to easily remove
- Bug with spaces: https://x.com/janwilmake/status/1898753253988253946
- Add https://www.simpleanalytics.com event if free plan (**yes, is free**) (see: https://docs.simpleanalytics.com/events/server-side)

🤔 Review it: What prevents me from hosting this at uithub.com with uuithub.com being the public staging environment that can be unstable? I just made it possible to vary between `wrangler deploy` and `wrangler deploy --production`. Prod can still break when editing sub-services though, so this is difficult.

# uithub as API product

- Provide programmatic way to login and get API key, and document this in the OpenAPI. It's probably good to add this into sponsorflare as well. --> Follow MCP recommended oauth 2.1 spec!!
- Provide programmatic way to retrieve usage and show this in a table on per-month basis as well as last 14 days on a per-day basis in a graph.
- Provide ability to create/rotate api key, and ensure the api key is not the same as the key you login with, but a key specifically made for API use.

After this is there, this'd be a great thing to show to people, as a minimal example of how to build a paid API with Cloudflare.

# Ingestzip wiki broken

All files are empty - it may be the inflate/deflate method? https://ingestzip.uithub.com/https://wikizip.forgithub.com/Netflix/Hystrix/wiki

BONUS: `ingestgit` would stream the git clone, rather than having to clone to fs on vercel, making it much faster.

# Cache and log for github

- In https://cache.forgithub.com/{owner}/{repo}/{issues|discussions|pulls}/{number} ensure to respond with a file object
- present every thread as JSON and MD
- After updating this, confirm navigating works for issues, discussions, pulls
- 🤔 Figure out how to apply plugins when there is no room for it in the URL (there is no tree) - possibly, adhere to some other standard that can also be easily generated from the frontend through a string-replace mechanism.
- Do the same for https://log.forgithub.com making these paths available. Confirm it works.

# Plugin monetisation incentivization

Come up with a good way for any plugin to provide FREEMIUM functionality. how old is the data, is the data fresh? is there a better version of the same data? if so, how can it be made available? Maybe the plugin should return one of these in response headers: Age, Date, Last-Modified, ETag, Link header (RFC 8288), Warning header (RFC 7234) - https://datatracker.ietf.org/doc/html/rfc7234#section-5.5. Maybe I could do it by just adding a README file (or similar) to the files for any ingest plugin. For a transformation plugin, a README.md or `WARNING.md` file can be added as well. This should get a special place in the UI. For example, we can render the markdown in `WARNING.md` on top, if available, so it can reach things.

TODO:

- When building the tree, also collect important files: `README.md`, `WARNING.md`, `context.json`, `.genignore`, `package.json`, and others. This is useful to determine custom frontend stuff
- Render warning if present, rendering its markdown in the UI.

# xymake zips

Fastest way to get FREE one-time package for anyone else after oauth

Fastest way to get FREE one-time package for yourself after oauth

Ensure to add monetisation URL to x router; `premiumUrl` which would allow setting scopes for regeneration.

THIS IS HOW I MAKE MONEY.

# `transform-formdata` plugins

- Should already work.
- Make this work for SWC + parsing as primary example.
- The dream: have all source-context for every codefile bound to the file (e.g. as a giant comment)

# `transform-file` plugins

Also think about the `transform-file` datatype which just passes each file that fits the mediatype to the endpoint as long as its content match the schema (if present). ActionSchema! This is tricky when doing this as a URL pipe, but can be done using `transformfile.uithub.com/{endpointurl}`. At some point we're gonna have to pass more parameters to it though, but this could be done using OTP.

Maybe also needs to be https://transformfile.uithub.com/{openapiUrl}/{operationId}

Similarly, maybe ingest plugins need openapi+operation (to know output type beforehand, to know if a plugin is another source)

# generate `.genignore` files

Can be done based on filetree and the default genignore with max certain maxtokens. Can be done using deepseek or cloudflare-based model. Can be done on-demand, stored in KV.

Fix paymentflow. ❌ Sponsorflare Sponsoring isn't working for new sponsors. Fix this by looking at changes too (or let's move to Stripe?)

Put sponsorflare in front, require signin, require balance > -1.

⏳ **Ongoing**: response and/or issue/pr for other providers to also support `.genignore` rather than just `.{platform}ignore`. 🟢 repoprompt. 🟠 repomix. 🟢 gitingest. 🟠 cursor. (RESEARCH OTHERS)

# `context.json`

Separate requests in `filter.js` that looks for `data.context` and if it exists, render questions. Add `filter.js` tab!

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

# plugins i rly wnt

- monoflare to cloudflare
- cloudflare to bundled, deployable, cloudflare
- A plugin for bundling in general
- npm install
- swc parse + simplification
- typescript to typescript + bundle of entire context/dependencies
- uithub.filter
- uithub.llms
