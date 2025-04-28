# TODO

1. ✅ make it usable and gather early feedback (silently open source it) (TARGET: april 8, 2025)
2. ✅ Rename all of zipobject to uithub. uithub means 'universal information terminal hub'
3. ✅ Let's show some ppl/ais and figure out what to do next! (did this until april 20, 2025)
4. ✅ Deploy to uuithub.com
5. ✅ Announcement (Friday, april 25th, 6PM)
6. Critical stuff
7. UI enhancement
8. Plugins POC
9. `FAQ.json`
10. `.genignore`
11. Implement `uithub.otp` and use it in `uithub.ingestzip`
12. Implement `monetaryurl` and use it everywhere
13. Implement useful plugins!!! Make the footprint of a plugin as simple as possible without loosing capability. E.g. also allow file=>file.
14. Add ability to configure a `dev` plugin with cookie for remote development with uithub as DX interface for testing.

# Critical stuff

- ✅ Clean up `ingestzip`; needs proper binary filter on paths as well as content. May need a few more minor improvements.
- ❗️ Fix paymentflow. ❌ Sponsorflare Sponsoring isn't working for new sponsors. Fix this by looking at changes too (or let's move to Stripe?)
- ❗️ `outputmd` needs the whole file-tree in the md result with info on tokensize and what was omitted. Let's make this good.

Let's focus on this, making uuithub actually better than the v1.

# UI Enhancements 

- In `uithub.search` expose whether or not tokens were capped with `maxTokens` or not. Then, In uithub UI (`vscode.html`), add filter warning if tokens were capped that says "apply filters for better results".
- `search.js`: basepath should show up on search to easily remove (maybe should first ensure for a basePath in `window.data`)
- `explore.js`: gray out based by comparing final paths with filetree via `string[].includes`. For this we need the final tree as structured data as well.

# Genignore UI

It'd be a great way to get a better default filter. It's hard though as we want not to cache too fast.

- ❗️ Fix genignore in old uithub so I can make PRs for it. 🔥 Important for adoption. Huge boost to SEO.
- ❗️ `?genignore` can be empty to disable, a URL to get from there, or a genignore content string to overwrite
- Use https://uithub.com/OAI/OpenAPI-Specification?genignore=https://genignore.forgithub.com/custom/oai__openapi-specification/.genignore and confirm that works.
- Put a badge onthere with a nice message.
- Add UI to edit .genignore parameter in old version.
- In this modal you should be able click through to add the `.genignore` to the repo. There should be a comment inthere refering to uithub
- ❗️ Fix 'add to readme' button default branch (should be added into context!)

# `FAQ.json`

- uithub should always look for `FAQ.json` and `.genignore` and if they exist, push to the HTML
- In uithub interface, FAQs should be easily accessible if the file is present (probably in search tab)

# Plugins

- Make `ingestjson.uithub.com` so all the apis make sense!
- Also figure out how to nail navigation.
- Also try the "api" datatype which just passes each file that fits the mediatype to the endpoint according to some convention. ActionSchema!
- Make `domains.json` function
- Add default fetch to try `/archive.zip` if a domain is given that isn't proxied
- ❗️ Plugins: at least the API ones from URL should work! But also the formdata=>formdata should be straightforward to add it in.


# Get response

Could be big; https://github.com/refined-github/refined-github/issues/8423#issuecomment-2834412514 https://x.com/fregante