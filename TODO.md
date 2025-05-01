# TODO

1. ✅ make it usable and gather early feedback (silently open source it) (TARGET: april 8, 2025)
2. ✅ Rename all of zipobject to uithub. uithub means 'universal information terminal hub'
3. ✅ Let's show some ppl/ais and figure out what to do next! (did this until april 20, 2025)
4. ✅ Deploy to uuithub.com
5. ✅ Announcement (Friday, april 25th, 6PM)
6. ✅ Nailing omni-compatible navigation
7. Minor improvements
8. Cross-domain plugin system
9. packagedocs plugin
10. `.genignore`
11. `context.json`

^^^ DEADLINE: May 10th = FOCUS ^^^

12. uitx cli
13. forgithub.lists source
14. Implement `uithub.otp` and use it in `uithub.ingestzip`
15. Implement `monetaryurl`, pluggable into `sponsorflare` and `stripeflare`, and use it everywhere

^^^ This can still take several weeks to make good. Target: end of may ^^^

# Minor improvements

In `outputmd`, add the params that were used to search as frontmatter. Also, add warning to the top if tokens were capped.

`outputjson` should take request.body as possible way of input (JSON output should work)

`?accept=multipart/Form-Data` should render HTML

Ensure we get the default branch for any github repo from a KV.

We don't get the size of filtered out files. Ensure we still get this (keep content-size header alive). When filtering out files in `ingestzip`, ensure original filesize is preserved.

`search.js`: basepath should show up on search to easily remove

Bug with spaces: https://x.com/janwilmake/status/1898753253988253946

Add https://www.simpleanalytics.com event if free plan (**yes, is free**) (see: https://docs.simpleanalytics.com/events/server-side)

# Plugins

❗️ Before i start with plugins, I want to nail the basics for file hierarchy exploration. Everything must work super smoothly. Maybe I should decide doing this later, if there are more improvements to be made for optimal smoothness. It's super obvious plugins are gonna be epic, but lets do the things in the right order.

- Make `ingestjson.uithub.com` so all the apis make sense!
- Also try the "api" datatype which just passes each file that fits the mediatype to the endpoint according to some convention. ActionSchema!
- Make `domains.json` function
- Add default fetch to try `/archive.zip` if a domain is given that isn't proxied
- ❗️ Plugins: at least the API ones from URL should work! But also the formdata=>formdata should be straightforward to add it in.
- Implement useful plugins!!! Make the footprint of a plugin as simple as possible without loosing capability. E.g. also allow file=>file.
- Add ability to configure a `dev` plugin with cookie for remote development with uithub as DX interface for testing.
- Add support for a xymake router
- Most interesting plugins:
  - 1. typedoc or similar
  - 2. llms.txt plugin (just taking markdown)

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
