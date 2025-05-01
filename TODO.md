# TODO

1. ✅ make it usable and gather early feedback (silently open source it) (TARGET: april 8, 2025)
2. ✅ Rename all of zipobject to uithub. uithub means 'universal information terminal hub'
3. ✅ Let's show some ppl/ais and figure out what to do next! (did this until april 20, 2025)
4. ✅ Deploy to uuithub.com
5. ✅ Announcement (Friday, april 25th, 6PM)
6. `.genignore` and `context.json` launches
7. Critical stuff
8. UI enhancement
9. Nailing omni-compatible navigation
10. Improving markdown output

^^^ DEADLINE: May 10th = FOCUS ^^^

1.  packagedocs plugin
2.  uitx cli
3.  forgithub.lists source
4.  Cross-domain plugin system
5.  Implement `uithub.otp` and use it in `uithub.ingestzip`
6.  Implement `monetaryurl`, pluggable into `sponsorflare` and `stripeflare`, and use it everywhere

^^^ This can still take several weeks to make good. Target: end of may ^^^

# Nailing omni-compatible navigation

🤔 Make it possible to see search filters in tree as well by moving this logic to the backend. It's likely best to stream the formdata after search to `uithub` directly so i can build/return the tree instead of `ziptree`. This way I know which files got filtered using `x-filter`.

✅ `outputmd` should take FormData from body rather than just from URL

✅ The `output*` service should be called using `repsonse.body.tee()` in `uithub`. We use the structured FormData output to generate the tree in a helper utility function.

✅ Ultimately, the tree datastructure would be `{ [segment]: { size: number; filtered: boolean, children: this }}`

✅ Pass StandardURL data to HTML `window.data`.

✅ Add `x-filter` and `x-error` type safety to `multipart-formdata-stream-js`

✅ Create `buildTree` (take inspiration from: `uithub.ziptree`)

Get `defaultBranch` in another way. This is github specific, so maybe should be done in the `github.ts` router?

Apply `StandardURL` data and new tree datastructure in frontend. Ensure we use it to navigate!

# Critical stuff

Add https://www.simpleanalytics.com event if free plan (**yes, is free**) (see: https://docs.simpleanalytics.com/events/server-side)

Bug with spaces: https://x.com/janwilmake/status/1898753253988253946

# UI Enhancements

- In `uithub.search` expose whether or not tokens were capped with `maxTokens` or not. Then, In uithub UI (`vscode.html`), add filter warning if tokens were capped that says "apply filters for better results".
- `search.js`: basepath should show up on search to easily remove (maybe should first ensure for a basePath in `window.data`)
- `explore.js`: gray out based by comparing final paths with filetree via `string[].includes`. For this we need the final tree as structured data as well.

# Improving the markdown output

- Add `maxTokens` filter to `ingestzip`, but ensure it still browses through the pathnames (but skipping content). This is more efficient than doing it later on and will ensure we get the full tree still. **🤔 Not sure! maybe its better to do this after we built up the tree. For formats other than markdown, maxTokens isn't that important. Maybe the tree should also be something that we always append/prepend as a file. Pretty useful**

- When filtering out files in `ingestzip`, ensure original filesize is preserved.

- When generating full markdown-tree, also get token size for each file/folder, and show the size on folders

- Add ability to omit filtered files out of the tree when it makes sense (see https://x.com/janwilmake/status/1916841093162831924). Goal would be to get the tree that makes most sense under 10k tokens for any repo, even for bun.

# Performance check-up

Figure out how I can nicely benchmark speeds in different ways of the different plugins and the time for estabilishing the connection between the different workers. Do another deepdive on how to make this as fast as the original uithub on vercel.

# generate `.genignore` files

Can be done based on filetree and the default genignore with max certain maxtokens. Can be done using deepseek or cloudflare-based model. Can be done on-demand, stored in KV.

Fix paymentflow. ❌ Sponsorflare Sponsoring isn't working for new sponsors. Fix this by looking at changes too (or let's move to Stripe?)

Put sponsorflare in front, require signin, require balance > -1.

⏳ **Ongoing**: response and/or issue/pr for other providers to also support `.genignore` rather than just `.{platform}ignore`. ✔️ repoprompt. 🟠 repomix. 🟠 gitingest. 🟠 cursor. (RESEARCH OTHERS)

# `context.json`

Separate requests in `filter.js` that looks for `context.json` in current branch and if it exists, render questions. Add `filter.js` tab!

In uithub, magic filter that creates path filters, and fills into search and localStorage.

From filter page, if filter is applied, add button `Add to context.json` that adds copies full `context.json` or one item into clipboard, then navigates to edit/create that file (depending if it pre-existed).

If no filter is applied, add button to generate custom `context.json`

https://contextjson.com/owner/repo: Separate tool to generate a new `context.json` based on tree+README (https://uuithub.com/owner/repo?pathPatterns=README.md), and add to your project via github.
