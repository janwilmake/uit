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
