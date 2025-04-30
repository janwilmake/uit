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

# `.genignore`

🤔 How are files in the zip sorted? How to get the `.genignore` asap, then use it to filter files? How will it work if I have multiple repos and am ingesting them as a single FormData stream? The `.genignore` won't be in the root anymore. Generally I just need a way to get config files from any zip, beforehand, without making it slower.

✅ I've added `genignore.ts` to `ingestzip` so it always first finds genignore or uses the default.

✅ If `genignore=false` is provided, should disable default or configured genignore.

✅ If `excludePathPatterns` is provided, these are added to the patterns (duplicates removed)

✅ Update OpenAPI spec

✅ exclude patterns should not include ones starting with # or if its an empty string, trimmed.

✅ In frontend, for some reason. it is rendering it as html. improved escape functionality

✅ In frontend add `genignore=false` checkbox titled `disable genignore`.

✅ In frontend, add button `Create .genignore` that does the same as README button, but for `.genignore`

# https://genignore.com

✅ Research the `.gitignore` specification and compare that to VSCode specification for `files to include/exclude`. Determine how `.genignore` should work, and write that into a spec at `uit/specification/genignore.md`

✅ Besides the issue, DM them. This should be enough to make `.genignore` succeed as a standard!

Create a nice landing for genignore.com that explains the concept using that file. Also include the fact that repomix and gitingest also had introduced/discussed similar concepts, but a universal one is more desirable.

Target: issue in gitingest and repomix to also support `.genignore` rather than just `.repomixignore` and `.gitingestignore`.

After confirmation from both parties, create a launch thread for `genignore` on X.

Confirm that `.genignore` works like desired.

Try to improve the excludePathPatterns so negations work as expected, so https://uuithub.com/janwilmake/forgithub.popular?excludePathPatterns=*&excludePathPatterns=%21README.md works. Potentially, people wanna have only a few specific files in their context, which should be specified like `*.*\n!README.md`.

Now we can also create specific includes when generating something with just genignore!

# `context.json`

Separate requests in `filter.js` that looks for `context.json` in current branch and if it exists, render questions. Add `filter.js` tab!

In uithub, magic filter that creates path filters, and fills into search and localStorage.

From filter page, if filter is applied, add button `Add to context.json` that adds copies full `context.json` or one item into clipboard, then navigates to edit/create that file (depending if it pre-existed).

If no filter is applied, add button to generate custom `context.json`

# contextjson.com

https://contextjson.com/owner/repo: Separate tool to generate a new `context.json` based on tree+README (https://uuithub.com/owner/repo?pathPatterns=README.md), and add to your project via github.

Put sponsorflare in front

# Critical stuff

Fix paymentflow. ❌ Sponsorflare Sponsoring isn't working for new sponsors. Fix this by looking at changes too (or let's move to Stripe?)

Add https://www.simpleanalytics.com event if free plan (**yes, is free**) (see: https://docs.simpleanalytics.com/events/server-side)

Bug with spaces: https://x.com/janwilmake/status/1898753253988253946

Could be big; https://github.com/refined-github/refined-github/issues/8423#issuecomment-2834412514 https://x.com/fregante

# UI Enhancements

- In `uithub.search` expose whether or not tokens were capped with `maxTokens` or not. Then, In uithub UI (`vscode.html`), add filter warning if tokens were capped that says "apply filters for better results".
- `search.js`: basepath should show up on search to easily remove (maybe should first ensure for a basePath in `window.data`)
- `explore.js`: gray out based by comparing final paths with filetree via `string[].includes`. For this we need the final tree as structured data as well.

# Nailing omni-compatible navigation

Make it possible to see search filters in tree as well by moving this logic to the backend. It's likely best to stream the formdata after search to `uithub` directly so i can build/return the tree instead of `ziptree`. This way I know which files got filtered using `x-filter`.

The `output*` service should be called using `repsonse.body.tee()` in `uithub`. We use the structured FormData output to generate the tree in a helper utility function.

Ultimately, the tree datastructure would be `{ [segment]: { size: number;filtered: boolean, children: this }}`

This is super critical to make uithub nice to use... including for other domains and ingesttypes.

Ensure we use the `domain.json` setup and request parsing to navigate!

# Improving the markdown output

- When generating full markdowntree, also get token size for each file/folder, and show the size on folders
- Add `x-filter` and `x-error` type safety to `multipart-formdata-stream-js`
- Add `maxTokens` filter and `basePath` content-filter to `ingestzip`, but ensure it still browses through the pathnames (but skipping content). This is more efficient than doing it later on and will ensure we get the full tree still.
- Add ability to omit filtered files out of the tree when it makes sense (see https://x.com/janwilmake/status/1916841093162831924). Goal would be to get the tree that makes most sense under 10k tokens for any repo, even for bun.
