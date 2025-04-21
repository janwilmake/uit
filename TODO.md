# TODO

1. ✅ make it usable and gather early feedback (silently open source it) (TARGET: april 8, 2025)
2. ✅ Rename all of zipobject to uithub. uithub means 'universal information terminal hub'
3. ✅ Let's show some ppl/ais and figure out what to do next! (did this until april 20, 2025)
4. ✅ Deploy to uuithub.com
5. As usable as v1, but with plugins

# 2025-04-21

- ✅ Solved all major problems found in initial feedback (see [ADR](ADR.md))
- ✅ Make `GETTING-STARTED.md` guide
- Implement `uithub.otp` and use it in `uithub.ingestzip`
- Implement `uithub.murl` and use it everywhere
- In `uithub` improve logic with plugin system
- Make plugins usable from the UI by clicking them after pinning.
- Add ability to configure a `dev` plugin with cookie.
- Make all plugins work!

# `FAQ.json`

- ✅ Make a schema for it; answers would be instantly answerable by LLM
- ✅ Create default faq and FAQ.json for `uit` which, currently, just inherits from the default.
- uithub should always look for `FAQ.json` and `.genignore` and if they exist, push to the HTML
- in uithub interface, FAQs should be easily accessible if the file is present (probably in search tab)

# Genignore UI old github

It'd be a great way to get a better default filter. It's hard though as we want not to cache too fast.

- ❗️ Fix genignore in old uithub so I can make PRs for it. 🔥 Important for adoption. Huge boost to SEO.
- ❗️ `?genignore` can be empty to disable, a URL to get from there, or a genignore content string to overwrite
- Use https://uithub.com/OAI/OpenAPI-Specification?genignore=https://genignore.forgithub.com/custom/oai__openapi-specification/.genignore and confirm that works.
- Put a badge onthere with a nice message.
- Add UI to edit .genignore parameter in old version.
- In this modal you should be able click through to add the `.genignore` to the repo. There should be a comment inthere refering to uithub
- ❗️ Fix 'add to readme' button default branch (should be added into context!)

# llms.txt convention

- `llms-full.txt`: This page should filter to only include the full tree and md files capped at a certain threshold.
- `llms.txt` This could include JUST the tree and maybe also readme.
- caching should probably be configurable on the plugin level, but handled by uit. for llms.txt it'd be good to cache strongly with stale-while-revalidate.

# New GitHub smooth transfer

Go back to new `view.html` from old uithub, keeping it clean. Ideally, landing on the repo should instantly give the best possible context without settings. Settings are 'advanced'. People love it for that. New design and filter principles shouldn't be done lightly.

Ideally, make the new one work as well as the old, with the old layout first. From there I can open up more doors without risking anything.

Let's try making the new one FAST FAST FAST for the top repos you'd expect people to search.

# `.genignore` selection + generation worker

- Always check KV directly and give the stale one while revalidate if needed. need result within a few ms to start filtering.
- Look specifically for all `.genignore` files everywhere, 1 hour cache.
- If non available, generate `.genignore` based on the tree and README. 1 week cache
- In the search tab, turn exclude pattern into textarea. prefil exclude patterns with the value from codebase or the generated value, and can be overwritten with ease.

# Feature Parity V1

- Should charge small fee for use of uithub API with permanent 402 if balance under $ -5 or so.
- Add https://www.simpleanalytics.com event if free plan (**yes, is free**) (see: https://docs.simpleanalytics.com/events/server-side)
- Test `isRegex`
- Never hit white screen, 404/429/402 if needed
- Test payment flow
- Test speed with large repos and make it faster if deemed too slow
- JSON/yaml buttons don't work yet. Should be an easy Claude prompt, or we can also remove them maybe.

This would be something I'm confident to ship and share with the world, fully replacing v1.

# Feedback tl;dr - open questions to make the marketplace work:

- ✅ Error handling sucks. how to improve?
- ✅ Need standardized way to charge
- ✅ URL chain auth pass sucks.
- No easy getting started/docs. how to run uithub and improve individual components locally? how to easily develop a new plugin?

# OBSERVATION:

Master redirects to production branch. does master always redirect to the deafult branch?????? for zip, maybe https://github.com/cloudflare/cloudflare-docs/archive/refs/heads/production.zip but for other things, definitely not.
