# TODO

🤔 I feel like nerding out on this a bit and showing some love to my users... I still receive most of my praise for uithub. Let's keep working on it and make it an even better foundation!

1. ✅ make it usable and gather early feedback (silently open source it) (TARGET: april 8, 2025)
2. ✅ Rename all of zipobject to uithub. uithub means 'universal information terminal hub'
3. 🟠 Let's show some ppl and figure out what to do next!
4. Feature parity with v1
5. Deploy/transition (TARGET: april 18, 2025)
6. make it better, adding lots of new features.

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

- No easy getting started/docs. how to run uithub and improve individual components locally? how to easily develop a new plugin?
- error handling sucks. how to improve? Maybe better to ensure a good way of testing independent FormData components.
- need standardized way to charge
- url chain auth pass sucks.

# OBSERVATION:

Master redirects to production branch. does master always redirect to the deafult branch?????? for zip, maybe https://github.com/cloudflare/cloudflare-docs/archive/refs/heads/production.zip but for other things, definitely not.

## Ideas

### Error handling

Error handling sucks. how to improve?

- Files that error out should maybe add `/.errors/...` files so errors can instantly be shown
- We could also conventionalize concatenating all errors and adding them as a last file
- Trailers (headers at the end) are another option so it doesn't become a file. However, this could be trickier working with.

### No easy getting started / docs

How to run uithub and improve individual components locally? how to easily develop a new plugin?

- Figure out if I can do a check whether or not service bindings are connected. If possible, make hostname a configurable setting, and make service binding connection optional falling back to regular fetch
- Instruct running and hosting all individual services on Cloudflare. Add 'deploy on cloudflare' buttons.

### URL Chain Auth Pass Sucks

Doing body-body pipe in a single worker may slow down things but haven't tested yet. In the end it may be better as data comes from any source. Try if I can get it to work, and benchmark on speed. AI should be able to get it done and generalize from an array of requests that should flow into each other with custom headers and query parameters.

If that does not work out, brainstorm to make URL chain more secure and scalable, less error-prone.

In devmode, it'd be very cool to be able to see the intermediate result for any request as an explorable hierarchy. We could do this by creating clones of the responses and streaming those into a zip which can be made viewable in the browser.

### Need standardized way to charge

We cannot use x-price as response header as most servers would not know the exact price in the beginning. Besides that, there's no good way to track usage by which part of the chain right now.

Possible ways to solve it;

- Server self-manages: Send along `x-monetary-url` header to server that it can use with sponsorflare to add balance from to themselves and deduct it from the user. Along with expected max cost based on size and openapi spec, this can be a great way, since it allows a lot of freedom on how to charge, while respecting privacy of the user.
- Optional FormData header for `x-price` that accumulates over time so we know cost intermediate as well. When received formdata already contains this it shall just be ignored and overwritten.
- ❌ Trailer (header at the end) that specifies total cost incurred **probably worst option since it'd have a single price at the end and connection could be closed early**
