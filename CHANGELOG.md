# 19th June, 2024

- first version in https://github.com/janwilmake/github-contents-worker
- second version in https://github.com/janwilmake/github-contents-api

The first version, available at https://github.com/janwilmake/github-contents-worker was hosted at Cloudflare.

However, it became evident quickly that Cloudflares woker limits are too limited for downloading a large zipfile and unzipping it.

I therefore changed everything to use the [Vercel Functions](https://vercel.com/docs/functions). The first problem I encountered is it's not so straightforward to create a catch-all endpoint - something that was easy with Cloudflare, due to the routing mechanism Vercel and Next has implemented everywhere.

However, I found a neat little trick; my setting my `vercel.json` to this, ensures everything leads to `index.ts`.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/api/index.ts"
    },
    {
      "source": "/",
      "destination": "/api/index.ts"
    }
  ],
  "functions": { "api/*.ts": { "maxDuration": 60, "memory": 1024 } },
  "public": true
}
```

Also, the max duration of the function is now 60s, the max for the free plan. This is quite a lot.

## Streaming instead of naive unzip library

After hosting it on vercel, things still didn't go well. After switching `fflate` into `unzipper`, things become much faster and I can now download big repos of over 100MB without timing out.

# 20th June 2024

I tried isomorphic-git. However, it doesn't support `--filter blob:none` yet which makes it too slow to put on a vercel function.

See https://github.com/isomorphic-git/isomorphic-git/issues/1123 and https://github.com/isomorphic-git/isomorphic-git/issues/685#issuecomment-455423505

Also, `git` through `child_process` also doesn't seem to work on vercel easily.

If that would work, maybe this would be a great way to get all logging information for any repo, including recent changes and all kinds of statistics.

For now let's let it pass.

# 24th of June, 2024

Discovered github has this feature too, at least for PR's:

> ProTip! Add .patch or .diff to the end of URLs for Git’s plaintext views.

When did this get added? Is it part of the API? Let's proxy this feature so I have it documented.

# 15th of August 2024

third version in https://github.com/janwilmake/github-registry

Today I've made a breakthrough! This is now not only a github contents api anymore, but a full fledged github registry!

- It allows registering a new user into the registry, after which search engines can pick this up.
- It allows finding OpenAPIs based on the repo homepage.
- It allows fetching all repos of a user
- It allows private and public repos

## Create GitHub Registry

- ✅ Add redis-kv and /register
- ✅ remove .env PAT
- ✅ Add /remove, /register, /registry, /[owner]/registry, /[owner]/repos
- ✅ Add Redis .env
- ✅ Create the OpenAPI for this
- ✅ Register myself via openapi.html
- ✅ Test other endpoints

🎉 I can now very easily navigate through my repos, by category and see the high level 🎉

## Contents

- ✅ Get profile using the apiKey. Find how to get profile on ActionSchema and in code
- ✅ Merge `github-contents-api` into this so that one can be archived! Ensure it works with public repos first of all
- ✅ Also make it work with private repos for registered users
- ✅ Archive old repo and put readme, ideas, and proper routing

## OpenAPIs

- ✅ Any repo is now an OpenAPI that can be used for agents.
- ✅ Any user now has an OpenAPI that can be used for agents.
- ✅ Added repo page

# In-repo search (needed for better chat-completion)

- ✅ filesize hierarchy
- ✅ Adhere to `.genignore` in same way `.gitignore` works
- ✅ Groq API
- ❌ Disallow search for repos that are too big (zipsize or filecount) **wait until i encounter this problem**
- ✅ Hierarchy pruning
- ✅ Update OpenAPI: ensure it's well-documented

# Make it usable & fun

✅ added repo.html and chat.html

✅ The repolist main link should be going here

# Small useful improvements website github (august 17th, 2024)

- ✅ searchbar
- ✅ preload
- ✅ Show "Github username" input with search icon and 'Let's talk' CTA
- ✅ Instead of asking for PAT immediately, hide this at footer, small

# September 8, 2024:

Moved away from this in favor of irfc.cloud

# September 25

Moved away from the github logic in irfc.cloud and made the simplest version into uithub.com: just unzip with some filters! The power lies in the fact that this is so easy to use and it's super scalable as it works on serverless and is fully stateless.

# October 9

✅ Incase Accept header includes text/html, call API and embed it in `view.html` where its printed; otherwise, route to API.

✅ Create `view.html` where the same url is used to fetch text/plain and shows that in a codeblock and a large copy button. Looks like a text-plain page but isn't quite as it'll have a subtle topbar.

✅ Show tokensize

✅ Helps you add more filters easily to trim down the context length (click in tree)

✅ Added maxTokens filter and quicklink to docs

✅ Before deploying this, be sure that the original API remains unchanged. People already use it as simple API.

✅ Header menu: In the header, add a menu for:

- format -> json, yaml, text (new tab)
- maxTokens -> text input
- maxFileSize -> text input
- ext -> filter on extension found in current output and press save
- location -> filter on tree (make it available in JS) and onclick, go there.

# November 4th, 2024

✅ refactor to allow for smaller files.

✅ send issues and comare to alternate response functions

✅ implement them one by one using ai

✅ deploy and test minimal things

# Issues, compare, push (november 5th)

✅ Set provided apiKey-query and header as a cookie. try getting apiKey from cookie too

✅ Test creating issue (also in other person repo)

✅ Test comment (also in other person issue in other person repo)

# Push (november 6th)

✅ Test push via test file. test overwrite, test new branch, test every use case. Ask AI to make it.

✅ Fix: A renamed file gets no content

✅ Extrahere file editing functionality and add proper testing... Test multiple edits in longer file, adding lines, removing lines, changing multiple lines in different amount of lines. Test this independently of git first to confirm it's functional.

✅ Creation of a new repo based on an external repo (in push: create repo, create initial commit, if needed. Ideally this is a fork)

✅ ensure to check if we have write permission to the owner/repo

✅ if not, ensure to fork it and create the new branch in the resulting owner/repo (that is our own)

✅ Define Push Context Better

✅ Test that forks https://github.com/brunabaudel/01 then creates a new README for it, then makes a PR. The crucial part is, if we can read but can't write, fork and PR needs to happen automatically. If we can write though, things can be written directly.

🎉 This is super useful. I can now make PRs to any public repo with ease.

# Login HTML screen if 401 (nov 7)

✅ Try submitting a cookie that stays good forever to a backend endpoint

✅ If it works, use that cookie as auth. we may now be able to see private repos

✅ See if this cookie stays even after closing browser and opening again, even after days

✅ In https://uithub.com/login.html show page to login/logout with details on cookie.

🎉 If this works I don't need localStorage and can keep doing stuff serverside. big achievement and useful everywehere!!!

✅ If we get a 401 and accept includes HTML (browser) let's show a little input box and link to get a PAT. Ensure to tell people it only gets stored as cookie and we don't store or process it on our server.

# LLM config screen if 402 (nov 7)

✅ If we don't have LLM config setup yet, show a 402 error. Regularly that should be JSON with some instructions on how to bypass, but in browsers it can be showing a HTML that allows to select some popular LLM basePath + model combos, and a link to easily create an API key.

🤔 This will be the place where I can later monetize by showing a 'recommended' setting. This setting would navigate the user to a page where they can fill in stripe payment details, and retrieve an API key for "ClaudeFlair", which basically always gets you the best model available with improved finetues based on the task. We can literally just use our own Anthropic API key in the back and charge the same, plus an extra charge or percentage for requests and LLM calls.

# Issue/discussion/pull details in JSON, YAML, Markdown or HTML (nov 7)

✅ Provide accept/maxTokens to all issue endpoints that need it (and compare, and message)

✅ Ensure the GET things respond with a JSON rather than a Response

✅ Ensure this works if called from a browser and allow similar accept query param that defaults to HTML in the browser that shows things as markdown, with the header.

# Issue/discussion/pull HTML (nov 7)

✅ Create a HTML that nicely shows the entire issue/discussion/pr but in an easy to copy markdown format.

👀 Allows very useful PR Creation Agent that's very easy to use.

Flow:

- Create or navigate to an issue or discussion
- Replace 'g' with 'u'
- View issue again and click 'resolve'
- (first time) login with github ==> will set apiKey
- (first time) purchase LLM usage ==> will set model, basePath, llmApiKey
- Show message.html

# Pulls is broken (november 9, 2024)

✅ Fetching pulls seems to return a 404. Debug.

✅ Deploy.

# Limit tokens by default (november 9, 2024)

- ✅ Default to 50.000 tokens max (good for most free models)
- ✅ show this number on site if no param is given. If you remove it, it should set it to 10000000.
- ✅ If the tokens is limited by default, ensure an extra warning is shown in the header
- ✅ If however JSON or YAML is requested, we'd want to default to no limit.
- ✅ Confirm now that regular HTML pages load faster (good for SEO and UX)

# uithub main API improvements (november 9, 2024)

✅ uithub `tokens` in json

✅ Add `?lines=true`: This query param should prepend each line with the line number in a way such that the LLM can easily see that. Needed for `message` endpoint

# X posts (november 9, 2024)

Announce this on X in separate posts scheduled 1 per day.

- ✅ Schedule an X post for the issues/discussions/pulls improvement.
- ✅ Schedule X post for GET all issues/pulls
- ✅ X post for the `?lines` improvement

# Avoid keeping API key queryparam in browser (november 10, 2024)

✅ If `apiKey` is provided and accept header indicates its a browser, make it a cookie and immediately redirect removing the apiKey

🎉 This makes things much safer. Now, people are prone to sharing their API Key on social media accidentally.

# `thread.html` security (november 10, 2024)

✅ It renders markdown. Ensure it's secure so it won't be able to inject any JS. This could be used to steal people's API key by sending them a link.

✅ Wonder the same for all raw code I render. Is it possible to hack it in a way so it renders HTML accidentally? can this maybe be prevented some other way?

# Update OpenAPI v1 (november 10, 2024)

- ✅ describe default maxTokens
- ✅ add `?lines` param
- ✅ add repo token count
- ✅ issues, discussions, pulls
  - ✅ read all
  - ✅ read one
  - ✅ create one
  - ✅ accept header support

# Track independent users and the repos they visit (november 10)

✅ Create an upstash KV store for `uithub-analytics`

- ✅ 1 counted set of owner/repo pairs
- ✅ 1 counted set of request count
- ✅ 1 just regular kv (hash -> ip, username, email, location) and key is hash(apiKey) or hash(ip). Email/username is only requested using API key if there wasn't a value yet

🎉 At least now we also can track independent users and whether or not they have authenticated.. Great to keep track of this KPI.

## Resolver in workflow (november 11, 2024)

✅ Use OpenAPI in `workflow.ts` => AI can do this based on OpenAPI.

✅ Ensure LLM token, model, and basePath is provided in query parameters or using cookie (and set to cookie).

✅ In workflow, ensure to respond with 402 if `model`, `basePath`, `llmApiKey`, and `messageResolverEndpointUrl` aren't found in queryparams or cookies.

❌ Ensure to actually call the endpoint and stream stuff back into a HTML page, so we can show it nicely a la bolt.new but then in the format of a git diff that streams into existence.

✅ For issue resolving as well as messaging, we must assume it done from the default_branch if not provided.

✅ We must name the branch in the right way based on params and based on transformer result

✅ The following URLs should call `resolveMessage`:

- ✅ https://uithub.com/owner/repo/issues/123/resolve
- ✅ https://uithub.com/owner/repo/discussions/123/resolve
- ✅ https://uithub.com/janwilmake/microflare/message/message%20here

👀🤔 Instead of streaming it to a browser, we could instead schedule a qstash message with callback. This would have the benefit that it happens in the background and if you interrupt it it doesn't stop. This may be nice but we still will need the original streaming endpoint, so let's not do this immediately and see if we'll really need this in the end. After all, we could still do this type of within githuq when watching new issues instead...

## Stream with correct response and tie to HTML (nov 12, 2024)

✅ In `resolveMessage`, respond with a `ReadableStream` so it can take long enough. Add additional status updates inthere.

✅ Ensure the final result in `/message` and `/resolve` returns a PR or branch URL on github

✅ Add `/message` and `/resolve` to openapi v2

✅ It seems to go wrong either in `push` or in `resolveMessage`. Let's see what we get in and out...

🔥 I can now `/resolve` any issue. test test test 🔥

# Further `push` api Improvements (nov 12, 2024)

✅ After some thought, improved interface: explicit lines for removal, join set-utf8 and set-base64, add setting via URL...

✅ Test creating new branch (target) from main with slight edit.

# New OpenAPI (nov 12, 2024)

V2 OpenAPI (available at /openapi-v2.html)

- ✅ push
- ✅ messageresolver
- ✅ message
- ✅ resolve an issue/discussion

# Ratelimits are hard (nov 12)

I've made the issue to PR flow work! However, I'm running into several hard to fix problems:

The first one is the ratelimits...

Per-minute ratelimits are quite strict:

- gpt 4o: 2,000,000 TPM
- claude-3-5-sonnet-latest 80,001 TPM
- claude-3-5-haiku-latest 400,000 TPM

For Claude especially this is problematic. I would say a context of at least 5000 lines is desirable, meaning we can not even do 2 iterations per minute.

TODO:

- ✅ request uithub JSON with no maxTokens set, return early for repos with more than 50k tokens showing the proper warning... also return early if there's a file with more than 4000 tokens.
- ✅ if we get ratelimited, ensure to view the ratelimit header and retry after it can be done again. if not available, use exponential back-off. Let's make a good implementation for this once and for all.
- ✅ send a status update if ratelimit is hit so the server knows
- ❌ request ratelimit increase for claude. **this wouldn't be a solution as everyone has a superlow ratelimit**

# The stream stops without saying anything.❗️❗️❗️ HIGHEST PRIO ❗️❗️❗️ (nov 12, 2024)

This is hard to figure out especially since we are doing multiple layers of streams:

- uithub (vercel)
- filetransformers (cloudflare)
- anthropic.actionschema.com (vercel)
- anthropic

We need to locate the problem by creating a more general test for a long stream.

Thoughts:

- could be vercel 1m default execution limit (although a stream should keep going right?)
- could be a cloudflare default firewall that stops requests after 1 minute. may need to use different type of syntax...
- could be something else
- maybe move push and messaging to a worker (also good for making it a smaller codebase)

TODO:

- ✅ read about streams on cloudflare. confirm doing a stream from cloudflare for 10 minutes
- ✅ tested in browser and found that it always stops consistently at 60s which happens to be uithub vercel.json limit. confirmed by docs: https://vercel.com/docs/functions/streaming-functions --> node.js can't stream infinitely!
- 🤔 as uithub relies on node.js environment to have lot of memory (the reason we need vercel) it will be hard to support this streaming endpoint from vercel at all. as i want to do more with cloudflare anyway, it makes sense to make that the root of uithub, with the only endpoint going to vercel being the one that requires the zip files. also anthropic.actionschema.com can be migrated, probably easily. this way we won't even really need to stream per se!
- 🤔 Another idea is to split up the vercel repo into functions through vercel.json. This is way faster!
- ❌ Move anthropic.actionschema.com to cloudflare
- ❌ Create an uithub cloudflare worker
- ❌ For the zip endpoint, use vercel.uithub.com
- ✅ Moved `/push, /resolve, /message` to separate files with `runtime: "edge"` enabled.
- ✅ Ensure we also get 401 page if needed
- ✅ Test functionality on localhost first
- ✅ Confirm it can now do >60s.
- ✅ Deploy and test prod

# Thread API + HTML (nov 15, 2024)

✅ Use cache.forgithub.com at `/owner/repo/issues|pulls|discussions`, returning the respective subsets of data. Also add the following URLs in the data:

- refreshUrl uses ?refresh=true
- ✅ markdown_url goes to /[n]?accept=text/markdown
- ✅ Add details_url to each thread going to uithub address
- ✅ Relevant code URL goes to https://getrelevantcode.com/[owner]/[repo]/issues|discussions/[number]/relevant-code
- ✅ Resolve URLs go to https://filetransformers.com/[owner]/[repo]/issues|discussions/[number]/resolve/resolve|plan|confidence respectively

✅ If accepting HTML, load issues.html, pulls.html, and discussions.html. Requirements: show the thread items, clickable, and add buttons for clicking the item itself or any other thing to go outwards.

✅ Ensure to have a canonical url setup if needed. Research this.

# New query params (nov 16, 2024)

✅ Add parameter `?yamlFilter` that takes a YAML string and filters the files based on that, returning the context in md/yaml/html/json just like regularly. (see summarize-folder for example in js). NB: 16kb is limit which probably would limit this param to about 1600 files max, which is fine.

✅ Make `?lines=true` default

✅ Cleaned up the code a lot

# Monetisation (nov 18, 2024)

- ✅ added pricing page
- ✅ improved user tracking
- ✅ added request counting in time windows

# Bringing it together (nov 21, 2024)

✅ Confirm getrelevantcode actually hits cache or not, and ensure its securely done such that you can't just get a private thread or code without api key.

✅ Confirm getrelevantcode can respond in JSON and confirm customContextUrl doesn't conflict in certain ways with other provided params such as owner/repo

✅ In getrelevantcode I want to get a sense of money spent. Ensure to add this as a response header (tokens used, cache hit, etc).

✅ On thread item, show relevant code. OUT: copy to favorite LLM...

❌ use githubreadproxy directly to get the default_branch if we need it.

✅ Hide pricing from landing for now.

✅ Button on uithub header to go to see all issues.. Hidden.

✅ In issuespage, also add 'message'. Add a banner to the page that this is a 'research preview'.

✅ Add `?cacheOnly` param to getrelevantcode, set to true if we're out of credits. Ensure it only shows 402 if getrelevantcode returns 402, and always request it.

✅ Test the ratelimit stuff I made previously. Set the ratelimit for unauthenticated high enough for it not to cause issues for individuals checking regular code subsets, for now.

✅ Respond with the requests left in headers and in a replacement in the HTML.

✅ Use uithub.cache for **default_branch**, it's faster. Test it. Fallback to `main`.

✅ Use `uithub.cache?simple` to get **repo size** beforehand. Deny request if repo is too big (determine max size for repos that time out). For now, 1GB is big enough!

✅ Check env variables!

✅ Fix analytics `mget`. Test it.

✅ Test thoroughly and deploy this new version.

✅ Just tested the github issues workflow. Wow, that works incredibly well! I can imagine it's going to be **radical** once we also get to see the confidence etc etc. Placing the comment, generating the code, making the PR (or deciding not to) should be easy choices that automatically get executed.

# November 22

✅ Add `?omitFiles=true` so i can save memory in cloudflare. Added it to openapi too

# Pricing Page and Stripe Setup (November 22, 2024)

- ✅ Think about pricing formula and reflect it on the pricing page
- ✅ Create TOS and privacy policy pages (includes storage of personal details)
- ✅ Login to Stripe
- ✅ Add Stripe subscription plan. Ensure it includes requirement to accept TOS / privacy policy upon payment.
- ✅ When ratelimit is exceeded and you are trying to do an action that costs money, ensure to always respond with a 402
- ✅ Ensure a 402 status creates a payment link and responds with 402.html
- ✅ Change 402.html so it's a very nice sales page saying become a more productive dev - 10$/month [pay] CTA
- ✅ Add stripe callback to stripe and retrieve webhook secret
- ✅ Create a function to create a paymentintent with metadata attached (github ID required)

## `/buy` (nov 22, 2024)

- ✅ Should show 401 if no github ID
- ✅ Should create payment link in the background based on if you're premium already or not
- ✅ Should show 402 in the same way
- ✅ Pricing page link goes to `/buy` too
- ✅ Show credits in header. This gives people awareness that payment will be required.
- 🟠 Click goes to `/buy`

# Stripe Subscription Persistence (nov 23, 2024)

- ✅ in getrelevantcode, repsond with i/o tokencounts
- ✅ Deduct the right amount
- ✅ Add stripe keys and deploy
- ✅ Implement callback correctly doing nothing except logging
- ✅ Make a subscription to test and log

# Additional credit logic (nov 23, 2024)

- ✅ Send back the token usage from `getrelevantcode`, calculate that into price, and make it matter for large requests.
- ✅ 402 page logic to show the right stuff and create the right link
- ✅ Create a test fn that retrieves all subscriptions. Look if the github userId is there. ~~If not, we need customerId as well maybe, or there is a way to tie it to the customer when creating the payment link~~ **it is tied to the subscription now. perfect**
- ✅ Ensure there's a path to cancellation and this is documented ~~maybe its as easy as adding a link to the pricing page~~ **yes, it's that easy**!

# Stripe Webhook (nov 23, 2024)

- ✅ Implement `stripe-webhook.ts` for adding a subscriber and removing (cancel or pause events) setting it to the KV
- ✅ logic in webhook that puts the additional credits onto the user if it was a one-time payment.
- ✅ Correct logic adjusting creditsUsed if user has credits and spent the monthly allowance already

# small improvements (december 6, 2024)

- ✅ removed need for loading the repo (we don't need to know the default branch because we get commit sha, and the size is not important enough to block)
- ✅ uithub now works with exact commit shas too
- ✅ tried another approach caching the zip uncompressed at cloudflare but seems very expensive as it's a single write per file. storing it as a JSON object will hit memory bounds too easily and/or complex. left research at https://github.com/gildas-lormeau/zip.js/issues/545

# December 10

solved a small bug where https://uithub.com/ai16z/eliza/ got 404. added a redirect to https://uithub.com/ai16z/eliza

# January 9, 2025

✅ Update `uithub` to improve size: Have it also count files, total text characters, and lines count. Also ensure its possible with a param to only get the size.

# March 12, 2025

- ✅ Ensure to show logged in
- ✅ Ratelimit without login 10x per hour
- ✅ With login throw 'payment required'

## Ratelimit, auth, and monetisation (2025-03-15)

- ✅ Remove stripe stuff. Full sponsorflare support
- ✅ Create ratelimit DO. ip-based ratelimit for unauthenticated and underfunded users (balance < -1.00): 25 requests per hour unauthenticated, 50 per hour if signed in.
- ✅ Make it work again. getting 401 now
- ✅ Remove old 402 page
- ✅ Ensure to have a 404 page with login button and privacy policy and terms, that support private access, even if you are already logged in.
- ✅ Ensure to have a 429 page with counter with either login button and privacy policy and terms, or if logged in, it shows balance and link to sponsor more.
- ✅ Fix issues regarding login cookies etc, ship new version sponsorflare that makes debugging easier

## Make it work sortof (2025-03-18)

- ✅ Proxy to https://zipobject.vercel.app directly. For now the api key stuff isn't very reliable yet, so it's best to leave this out for now. At a later stage, uithub is kind of a project on top of zipobject and should be connected accordingly.
- ✅ Show user in html
- ✅ Add message inputbox at bottom leading to https://chat.forgithub.com/owner/repo?q={input-urlencoded}
- ✅ forgithub is too vague for ppl. clear it up
- ✅ remove pricing entirely for now.
- ✅ Remove old usernames (cfa, k)
- ✅ landing: add mnemonic device section
- ✅ Cleaned up files a lot

# Make it as good as uithub v1 (2025-03-20)

**Artem / Murzin**: uithub UI can look better, filters must be easy to use (1% uses api only). More important button more prominent.

🤔 After brainstorming and experimenting with the UI, it became clear to me that, even though I initially thought it was cool to switch between a UI and raw text (md, json, yaml), the HTML interface should probably be the leading way to do get to your context. It's tricky that in the HTML interface I want to show different formats (JSON, YAML, or Markdown) while still handling the filetree, size, and datapoints as independent datapoints, because they become part of the interface. In the end it's likely better to:

1. Get the tree with sizes separately via https://tree.forgithub.com as well as repo metadata. As filetrees can be cached for a day with ease, this is going to be incredibly fast.
2. Show the view.html immediately after that, including perfect SEO
3. In the UI load the desired data via a fetch upon initialisation. This allows to already change filters while it's still loading, and faster navigation through large codebases. It also allows LLM filter which may be slow. The loading indicator is the desired UI here.

# Make it look good version (2025-03-20):

- ✅ Simplify HTML further
- ✅ Implement VSCode-style interface
- ❌ Tried removing flicker but failed.
- ✅ Get tree and content from https://zipobject.com in 2 separate api calls
- ✅ Calculate current tokens manually for now, simply doing `string.length/5` ^^
- ✅ Create {{template}} replacer and serve `vscode.html` with data
- ✅ Fix styling issues
- ✅ Render tree based on `window.data.tree` (folders with sizes, no files)
- ✅ Add 'REDIRECT_DOMAIN' var (Set to new.uithub.com for now) and redirect it to context.forgithub.com if landed on the worker. Great thing is: the static stuff will still be served from it!

## POC UIT (2025-04-02)

In the POC I want to focus on processing GitHub archives in this 4 step and making it available through the new uithub interface. The components needed are:

- `uithub.tree`: zip to tree-json-sequence
- `uithub.ingestzip`: zip to content-json-sequence
- `uithub.search`: apply standard search-filters (jsonseq->jsonseq)
- `uithub.merge`: turn potentially multiple json sequences into 1
- `uithub.outputmd`: double stream json seq into a markdown with tree with sizes first, content last.
- `uithub`: couples the above based on URL path with filters and presents resulting tree and md in HTML, adding ratelimiting, authentication, and monetisation.

- ✅ come up with the right JSON Sequence datastructure with minimal loss of information of all origin formats. see what I had in zipobject and zipobject.tree
- ✅ implement `ingestzip`
- ✅ implement search
  - ✅ lookup filters definitions zipobject
  - ✅ create definition in markdown for that with appropriate context
  - ✅ generate `jsonseq->jsonsec`
- ✅ implement merge
  - ✅ spec

# Output zip (2025-04-04)

✅ Implement `outputzip` to easily go from zip to zip in a streaming fashion

✅ Confirm its fast and immediately streams the zip through 2 layers

# FormData POC (2025-04-04)

- Make all endpoints accept POST with body without adding too much complexity. Keep definition leading
  - ✅ ingestzip
  - ✅ search
  - ✅ outputzip
- ✅ Implement clever URL logic on this: `/[domainOrOwner]/[repoOrId][.ext]/tree/[(shadow)branch]/[basePath]`. See `convention.md` for how exactly.
- ✅ I can now use `main.ts` for the markdown chain to go from any `storage --> formdata -> search [-> transform] -> zip`
  - ✅ it works from and to zip with direct streaming WITH BUN 🎉
  - ❌ with search in between it breaks now
  - ✅ try search via post first via node js fn
  - ✅ figure out if search has proper error handling
  - ✅ if search works, see if 3-step pipe works.
  - ✅ see if it also works in prod
  - ✅ see if it als works for bun
- ✅ Goal: https://uit.uithub.com/oven-sh/bun.zip/tree/main?basePath=/docs would immediately start streaming the zip.
- ✅ Improve url pattern more.
- ✅ Goal today: visit https://pipe.uithub.com/oven-sh/bun instantly get the first 50k tokens streamed back.

# Refactor (2025-04-05)

- ✅ Rethink the API so search and path search is clearly separated and it matches UI better
- ✅ Tie uithub to the new formdata version.
- ✅ Ensure tree and content load simultaneously
- ✅ Figure out why its sorta slow now? Maybe should still do stream of the content via separate frontend-fetch? Or maybe i can make it fast enough still. Speed is kind of the #1 reason for uithub to exist.

# Improved tree (2025-04-06)

- ✅ Ensure tree is cached using KV and `stale-while-revalidate` works too.
- ✅ Tree must load when branch wasn't provided
- ✅ Fill total repotokens from `tree.__size`
- ✅ Make dev easier with service-binding helper to use either fetch or binding. When bindings aren't connected would just fallback to regular fetch.
- ✅ 🎉 Confirm bun is fast now (loads in under a second)
- ✅ Ensure nav menu is open when we're at a specific path
- ✅ showFiles toggle must be localStorage-reminded
- ✅ Ensure it shows inactive files (based on path) greyed out
- ✅ Ensure it shows the currenly active basePath highlighted (purple).
- ✅ Add copy button to tree nav that gets full file tree (JSON string is fine for now).
- ✅ In `uithub.pipe`, ensure 'basePath' follows through correctly. make it more flexible with `/`

# UI/UX (2025-04-06)

- ✅ Added markdown support
- ✅ Fix maxTokens input filter
- ✅ Fixed problematic misconception (token-count): https://x.com/janwilmake/status/1895375026939142292
- ✅ Menu always open by default
- ✅ Improved markdown suffixed message

# Add profile section & auth (2025-04-06)

- ✅ Make `profile.js` that gets activated after clicking the profile icon
- ✅ Show 'unlock premium features' with a button 'login with github'.
- ✅ After sign-in, show balance and donate button.
- ✅ List features that are unlocked after you donate.
- ✅ create and connect uithub client, test login
- ✅ fix ratelimiter

THIS IS KEY TO STARTING THE MARKETPLACE

# Fix URL structure (205-04-07)

✅ Bug: owners CANNOT. BUT! repos CAN contain dots, so ext cannot be part of id! Rather, make it part of page, e.g. tree.json, tree.md, etc. This is precursor to fixing https://new.uithub.com/brunabaudel/brunabaudel.github.io

# Auth works and is fast (205-04-07)

- ✅ When logged in i get `Tree errorFailed to fetch ZIP file: 404 Not Found` for public repo
- ✅ Pass on auth down the chain.
- ✅ Confirm going through both public and private repos works.
