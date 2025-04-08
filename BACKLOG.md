# lists

https://github.com/stars/{username} is the base of the url structure we wanna support

https://uithub.com/stars/janwilmake would provide all starred repos + details + lists + details, and support available filters too

https://uithub.com/stars/janwilmake/lists/{list-id}[/{page}/{branch}[/{repo}/...]] would provide all repos with branch {branch}

Ideally we'd create several parallel pipes for filters, and stream them back into 1 result. This parallelization would keep things super fast.

In the end, this type of search would be ideally be applicable to generated lists as well, not just github lists. This is a very interesting feature that would set uithub apart and create unfair advantage (as repoprompt, gitingest, etc, wouldn't be easily able to do this)

# `explore.js` search examples:

- (If too much code, make this an external HTML page) - Below the search inputs, list a few examples that would change the value of the inputs:
  - only md,mdx
  - omit package-lock.json
  - only ts,js,tsx but omit build
  - regex: only files with hardcoded URLs
  - regex: `import ... from "react"`

# search: don't load file for path filters (big on performance)

If a file can be filtered out without loading the file itself, that must be done!

I want things to be FAST. it should especially be fast skipping over files we don't need such as binary and files and files for which the path/size doesn't match.

# search early stop basepath (big on performance)

Can I detect if we passed the selected base path?

If the basePath DID occur before AND now we're past it, THEN we can stop safely, if we can assume things are alphabetical.

Add stop criterium if there was one or more basePaths. if so, get last basePath alphabetically and stop after the pathname is behind this one. Will be GREAT for performance for large repos. Best make this a configuration though as it may not always be possible to rely on this!

# creating sha-cached basePath-based subzips (big on performance)

This could be big on performance as well!

Another idea to think about is to do paralelization on subzips even without basePath, later merging it. Imagine performing a search query on 300 zips this way! Could be much better than merging before search/filters.

# Add max-token cap warning

In `uithub.search` expose whether or not tokens were capped with `maxTokens` or not.

In uithub UI, add filter warning if tokens were capped that says "apply filters for better results".

# TODO before launch

- generally: it MUST be faster than uithub
- monkey test and try to find regressions
- create test on speed with top 100 repos and try to find any regressions
- support ouptutjson
- support outputyaml
- go over current api and see what is missing still for this to go live.

# Add shadow navigation

Should be added to uithub data so the UI makes navigation easy!

Should come from Source of truth of a flat JSON file and some should show up "Premium". would still navigate there and show a small preview if deposit isn't good enough! Plugin should choose the requirements (all from the JSON)

Based on what should features be free:

- repos over 1000 stars

Based on what should features require payment

- private repos
- organisation repos
- repos under 1000 stars

The premium features should require deposit of $50

Also add button to unlock for entire organisation/owner (contact me)

# Performance

🟠 Keep watching ratelimiter speed. Sorta slow sometimes, maybe ratelimt resets too fast which causes required reinitialisation which takes a bit longer?

# User onboarding XYMAKE by cheap `archive.zip`

When a user signs up for the first time, put them into a queue that builds `archive.zip` at https://xymake.com/[username]/archive/refs/heads/main.zip

The user should immediately see links to their last 20 posts on /dashboard and a link to `archive.zip` with loading indicator.

This archive should contain just the 20 last posts (with comments) of the user and some other details that can be easily found. It should cap if there are more comments than 20 to a post.

It should have a message at the end saying `visit xymake.com/pricing` to build a better context for [username] AT EVERY CONTEXT, at the end.

Archive can be downloaded directly or viewed with the uithub viewer: https://uithub.com/xymake.com/[username]

# Some bugs

- exclude-dir bug: https://x.com/jhogervorst/status/1900128634926514640
- Ensure the thing doesn't crash when files are empty (or other reasons), and never outputs incorrect JSON
- Bug with spaces: https://x.com/janwilmake/status/1898753253988253946

## Filter

- ✅ Add filter icon to sidebar that opens modal `/filter.js` which shows templated messages that, when clicked, will filter the repo files based on that.
- Make https://filter.zipobject.com work.
- Instead of filter.forgithub.com directly, use API for it with loading indicator.

## OPEN SOURCE

- ✅ renamed repo and Cleaned up repo + README - remove history and make open source.
- Make uithub open source - this is just the place for issues, it's not about the code per se.
- Think about open sourcing zipobject as well. my moat is the domain name and community - not the knowledge of how it works! Another moat could become the cache.
- Share longform how I made uithub/zipobject faster and cheaper in technical blogpost.

# MVP

- Binary urls for private repos: These should not use the raw.githubusercontent, but rather `zipboject.com/file`. Either that or ensure its clear how to access with raw.githubusercontent. can still be done with api key i guess and maybe it's just best.
- Ensure zipobject doesn't cache private repos! This may be a challenge. How to know this!? Is private repo zip location different?
- Public repos is as cheap as possible (see cost vercel), private repos cost is 10x (profit is here). We can do this if we add a `x-is-private-resource` response header.

# uithub as API product

- Provide programmatic way to login and get API key, and document this in the OpenAPI. It's probably good to add this into sponsorflare as well.
- Provide programmatic way to retrieve usage and show this in a table on per-month basis as well as last 14 days on a per-day basis in a graph.
- Provide ability to create/rotate api key, and ensure the api key is not the same as the key you login with, but a key specifically made for API use.

After this is there, this'd be a great thing to show to people, as a minimal example of how to build a paid API with Cloudflare.

# `/file` endpoint

Make https://file.zipobject.com work, or zipobject.com/file (to get a specific file)

`/file` was an endpoint that used a responded with a single file. Was needed for githuq/githus to show the file in the right mediatype, hence `mime-types` package. Should be a zipobject feature, especially cool with range request.

In forgithub.context, it should be called when page is `blob`, but in zipobject it's a separate endpoint.

In forgithub.context, proxy `owner/repo/blob/...` to `/file`.

Blobs support in uithub!

# Get back to users after launch

https://x.com/janwilmake/status/1895375026939142292

# Changelog API

What if we could track all changes?

- parse CHANGELOG.md using LLM
- parse (closed) issues using LLM
- parse (merged) PR's using LLM
- parse direct changes to default branch in chunks of LLM-comprehensible size
- every day look for closed issues marked as resolved, merged prs, and changelog for the past day
- use LLM to compress timerange into a summary or highlights of the timerange in various sizes (with references).

# Porting repos at scale to other frameworks/languages

Porting a repo to other language can already be done. However, it's hard to do.

First priority is the UX simplicity.

Afterwards, improve how it's done...

Once we have testing at scale, ports will be verifyable.

# Translating repos or comments to other languages

https://github.com/janwilmake/translate-codebase

# Using various strategies to solve issues for repos on GitHub

First step is the groundwork: the infra to make an issue instantly detected and starting a workflow. This creates a very visible uithub.

Just like cursor, the human is the verifyer, but since it's now a PR we don't need speed.

To improve it bigtime, we need verification through deployments and tests... Then it will be a true gamechanger to make this an open framework.

# Fetch async in html

May be better since SEO is now covered, while long loadingtime causes SEO to be worse (may not be able to load the og image).

Maybe what we should aim for is:

- count repo in set
- a sitemap with the most common used repos
- use view.html frontend that loads endpoint
- ~~find + serve cache + r2 html~~ ???

# Process .gitattributes

After some research I found that https://github.com/public-apis/public-apis doesn't give the README file (280kb) because of their .gitattributes setting

If present we need to process it (see https://claude.ai/chat/1ad5ee29-7ea4-4dce-a61f-02a2aa582189)

1. point to the raw githubusercontent url for files which are ignored from the ZIP
2. If any LFS pointer files are present, this will hint us there are other bigger files. Use https://uithub.com/{owner}/{repo}/raw/{branch}/{...path}

And make the raw endpoint: https://uithub.com/{owner}/{repo}/raw/{branch}/{...path}

```ts
const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
const apiResponse = await fetch(apiUrl, {
  headers: {
    Accept: "application/vnd.github.raw",
  },
});
```

Confirm that it works without api key... Also allow passing an API key header/cookie/queryparameter

# Bounty and Open Source Repo List

Put together a list of lists. Every list can be sourced by someone else and turned into a list of URLs of repos with a simple parser.

There aren't any lists on github of repos with bounties

Bounty program Apps:

- https://www.bountyhub.dev
- https://algora.io
- https://www.boss.dev/issues/open

However, we can also assume any open source repo with funding or revenue would give us money if we speed up their development.

- Scrape the bounty program app apis or websites and get to a list of owners and repos with that
- Scrape https://www.ycombinator.com/companies/industry/open-source and find the belonging github owners
- Scrape https://www.ycombinator.com/companies (5000+) and figure out if they have a github repo and have the owner.
- Scrape github's biggest open source repos and figure out if they belong to companies with revenue or funding.

Obviously this will take some time to get to this in an automated way... But it's much faster to start manually creating a single list in a repo readme: https://github.com/janwilmake/awesome-bounty-repos

From here, we need to get to determine which repos are properly suitable for us to navigate in and build proper issue validation.

After I nailed this these filters, I can start cloning repos and solving issues in my cloned repos, and make PRs.

If I add a feature with a "TIP JAR" to every PR I made with a suggested price, the algo can start optimising maximising profit and minimising cost, in other words maximising EV.

Maybe this is too ambitious still, because the repos are actually very large, issues can be complex, and priorisation is hard. Maybe it's better to first focus on my own code of which I know much better how to solve issues.

# Static Hosting Performance

🤔 After trying this it quickly becomes evident that the speed is not satisfactory. Of course we could conclude we need it to be hosted in a assets worker but that would make it way less scalable. There are several other ways to improve speed though, so let's do it.

🤔 After trying it a bit more, it becomes evident the solution isn't scalable to large repos. oven-sh/bun just crashes... But that's also not my target now, is it?

Immediate things I think it would be better:

- For any website visited I could do an API call to check the latest update on that branch each minute in a `waitUntil`. That would make things much more up-to-date.
- Add KV cache layer onto individual github files at https://subdomain.githuq.com/{path} with a timeout of 1 day or so.
- Add a way to force refresh `?refresh=true` that forces re-retrieval of uithub zip.

# Fast File Retrieval

A core problem that is also core to uithub is fast file retrieval. How I solve it now is by always getting the latest zip directly from GitHub. This is slow for big zipfiles. At a minimum, the latency is transfering the zip to my location which can only go with a 100mb/s or so I think.

Building a service on top of GitHub is hard because it's hard to know whether or not their zip files are updated. For my own repos I can use a webhook to refresh stuff, for public repos I can use github events. **The webhooks take maximum several seconds**, p95 is under a second. It's not instant. The events for public repos are delayed [at least 5 minutes](https://github.blog/changelog/2018-08-01-new-delay-public-events-api/) and may be [up to 6 hours](https://github.blog/changelog/2018-08-01-new-delay-public-events-api/).

When someone pushes something to GitHub, that is the source of truth. If that person is authenticated with my services, I can be sure to have the newest version within a few seconds, as I can immediately propegate it to my own services. However, for public events, that is not possible, and I cannot guarantee things to be up-to-date if I don't use the original zip.

For the purpose of uithub, it's quite feasible still to use the zip for most smaller repos, but for larger ones, it's kind of annoying, as it can take dozens of seconds with ease.

If we want to cache things, we have multiple options. The question is how long we'd want to cache because it would take a large amount of storage. For something like uithub and also for viewing a website quickly, I think maybe redis is great.

Pricing for Upstash Redis is $0.25 per GB-month. If we would just store something for an hour each time, and we do that 100 times a day with repos 1GB each, 100GB-hour, 0.13GB-month, so 3.4 cent per day, €1 per month. That's a lot. But what if we just store it for 10 minutes? Or just 1 extra each time you reload the page? Reduced cost a lot, small reduction in usability. This seems interesting. I'm basically buying myself a working memory for the edge. $0.000005 or 172k GB-minutes for $1. If 1 user needs 1GB, that's basically 172k user-minutes for $1. Nice to calculate it like that. 29 user-hours for 1 cent. If you look at it like that, and we can actually use the redis in this way, it's damn cheap.

So how do we actually get it like that?

- Max commands per second: 1000
- Max request size: 1mb
- Max record size: 100mb
- Max data size: 10gb
- Oh wait.... max 200GB bandwidth after which i pay 0.03-0.10 per gb. this is the bottleneck that makes it incredibly expensive.

Ok... So Cloudflare KV is also expensive... It's 0.50 per GB-month. But R2 is $0.015 per GB month! But R2 takes 30 seconds to propagate I read somewhere. Is this true?

ARGGHHHHHH all these different factors make this a very complex problem! In the end there are just so many variables... The implementation also depends a lot on the usecase... Maybe I should read about it a bit about other people's experiences. I wish there was just a way that you could just write down your usecase and the AI would automatically find the best implementation with all this experimentation, etc. We're almost there!...

# Making zip subset retrieval faster

[About zip archives](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives#stability-of-source-code-archives). Maybe I can do this:

- If I place the retrieval where the zip is.
- If I have the earliest possible filter
- If I use another language to do this such as rust

My original source is Github. The zip comes from there which is usually pretty fast.

After some tests, I found that retrieving a file from a zip can be incredibly fast. It takes less than a second to get https://uithub.com/file/facebook/react/blob/main/README.md and 2 seconds to get https://uithub.com/file/facebook/react/blob/main/compiler/packages/make-read-only-util/src/__tests__/makeReadOnly-test.ts even though the zipfile is an insane 600MB or so, compressed.

Doing some more tests from iad1 (us-east) I found that retrieving the zip via a fetch takes 50ms for small zips (claudeflair) versus 300ms for large ones (oven-sh/bun). However, parsing through the entire zip takes an additional 10ms for small zips (bun) versus 10 seconds for large ones (oven-sh/bun). After retrying I can see the zip of bun only takes 80ms to retrieve (may be cached by vercel or github), while the parsing of the zip still takes 8.7s for the image. However, if we encounter the file earlier, we now return early, which is a great advantage for things like `README.md`. This is all in production on max 3GB ram.

# TODO

Zipfiles of a repo vary widely in size, from several KB to several GBs and beyond. This makes it hard to have a uniform solution.

Depending on the needs i need to make uithub or githuq or githus faster. What these needs are isn't entirely clear yet. For now at least it works well enough without cache with small repos. Let's just keep it like that.
