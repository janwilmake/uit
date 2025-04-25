# TODO

1. ✅ make it usable and gather early feedback (silently open source it) (TARGET: april 8, 2025)
2. ✅ Rename all of zipobject to uithub. uithub means 'universal information terminal hub'
3. ✅ Let's show some ppl/ais and figure out what to do next! (did this until april 20, 2025)
4. ✅ Deploy to uuithub.com
5. As usable as v1
6. Create blogpost / announcement thread, DM influencers
7. Plugins that I already have, accessible for free.
8. FAQ
9. Genignore
10. Launch (Friday, april 25th, 6PM)

**After launch**

11. Implement `uithub.otp` and use it in `uithub.ingestzip`
12. Implement `monetaryurl` and use it everywhere
13. Implement useful plugins!!!
14. Add ability to configure a `dev` plugin with cookie for remote development with uithub as DX interface for testing.

# As usable as v1

TRY IT WITHOUT TODOLIST

- Should charge small fee for use of uithub API with permanent 402 if balance under $ -5 or so.
- Add https://www.simpleanalytics.com event if free plan (**yes, is free**) (see: https://docs.simpleanalytics.com/events/server-side)
- Test `isRegex`
- Bug with spaces: https://x.com/janwilmake/status/1898753253988253946
- Never hit white screen, 404/429/402 if needed
- Test payment flow
- Test speed with large repos and make it faster if deemed too slow
- JSON/yaml buttons don't work yet. Should be an easy Claude prompt, or we can also remove them maybe.

This would be something I'm confident to ship and share with the world, fully replacing v1.

# TODO before launch

- generally: it MUST be faster than uithub
- monkey test and try to find regressions
- create test on speed with top 100 repos and try to find any regressions
- support ouptutjson
- support outputyaml
- go over current api and see what is missing still for this to go live.

# Search: Don't load file for path filters (big on performance)

If a file can be filtered out without loading the file itself, that must be done!

I want things to be FAST. it should especially be fast skipping over files we don't need such as binary and files and files for which the path/size doesn't match.

# 2025-04-22 - start implementing plugins

- In `uithub` improve logic with plugin system ensuring the plugin from the JSON is used based on the page.
- Make plugins usable from the UI by clicking them after pinning.
- Make all plugins work for free

# New GitHub smooth transfer

Go back to new `view.html` from old uithub, keeping it clean. Ideally, landing on the repo should instantly give the best possible context without settings. Settings are 'advanced'. People love it for that. New design and filter principles shouldn't be done lightly.

Ideally, make the new one work as well as the old, with the old layout first. From there I can open up more doors without risking anything.

Let's try making the new one FAST FAST FAST for the top repos you'd expect people to search.

# Add max-token cap warning

In `uithub.search` expose whether or not tokens were capped with `maxTokens` or not.

In uithub UI, add filter warning if tokens were capped that says "apply filters for better results".

# Ratelimiter is slow

Keep watching ratelimiter speed. Sorta slow sometimes, maybe ratelimt resets too fast which causes required reinitialisation which takes a bit longer?

# `explore.js` search examples:

- (If too much code, make this an external HTML page) - Below the search inputs, list a few examples that would change the value of the inputs:
  - only md,mdx
  - omit package-lock.json
  - only ts,js,tsx but omit build
  - regex: only files with hardcoded URLs
  - regex: `import ... from "react"`

# Search early stop basepath (big on performance)

Can I detect if we passed the selected base path?

If the basePath DID occur before AND now we're paste it, THEN we can stop safely, if we can assume things are alphabetical.

Add stop criterium if there was one or more basePaths. if so, get last basePath alphabetically and stop after the pathname is behind this one. Will be GREAT for performance for large repos. Best make this a configuration though as it may not always be possible to rely on this!

# `FAQ.json`

- ✅ Make a schema for it; answers would be instantly answerable by LLM
- ✅ Create default faq and FAQ.json for `uit` which, currently, just inherits from the default.
- Uithub should always look for `FAQ.json` and `.genignore` and if they exist, push to the HTML
- In uithub interface, FAQs should be easily accessible if the file is present (probably in search tab)

# Genignore UI old github

It'd be a great way to get a better default filter. It's hard though as we want not to cache too fast.

- ❗️ Fix genignore in old uithub so I can make PRs for it. 🔥 Important for adoption. Huge boost to SEO.
- ❗️ `?genignore` can be empty to disable, a URL to get from there, or a genignore content string to overwrite
- Use https://uithub.com/OAI/OpenAPI-Specification?genignore=https://genignore.forgithub.com/custom/oai__openapi-specification/.genignore and confirm that works.
- Put a badge onthere with a nice message.
- Add UI to edit .genignore parameter in old version.
- In this modal you should be able click through to add the `.genignore` to the repo. There should be a comment inthere refering to uithub
- ❗️ Fix 'add to readme' button default branch (should be added into context!)
