# Improving the markdown output

- Add `maxTokens` filter to `ingestzip`, but ensure it still browses through the pathnames (but skipping content). This is more efficient than doing it later on and will ensure we get the full tree still. **🤔 Not sure! maybe its better to do this after we built up the tree. For formats other than markdown, maxTokens isn't that important. Maybe the tree should also be something that we always append/prepend as a file. Pretty useful**

- Add ability to omit filtered files out of the tree when it makes sense (see https://x.com/janwilmake/status/1916841093162831924). Goal would be to get the tree that makes most sense under 10k tokens for any repo, even for bun.

# Creating sha-cached basePath-based inferences (big on performance)

Figure out how I can nicely benchmark speeds in different ways of the different plugins and the time for estabilishing the connection between the different workers. Do another deepdive on how to make this as fast as the original uithub on vercel.

❗️ Found that `initialResponseTime` for `ingestzip` service is often in the ballpark of: 1750-2250ms. Caching the zip into KV or R2 makes a ton of sense to reduce this to 100s of ms.

1. the url + query is the unique identifier
2. we can destructure the url and make it incrementally more generic, the source being the most generic
3. when something needs generating, we can find the closest generation first, then generate from there to save on compute
4. when someone visits a repo for which the latest sha hasn't been indexed yet, all plugins and obvious paths should be added to a queue to pre-generate them. This makes everything superfast.

The logic of what to generate should be surfaced to give organisations or owners control. Pregenerating is an upfront investment that has future benefit to others, and could be seen as a business in itself. What would you pregenerate for others?

Only do the above for public repos with permissive lisence allowing commercial redistribution (for now).

> [!WARNING]
> Caching introduces legal risk

# X Plugin

1. give context of x threads found in the data
2. determine the key keyword or keywords that identify this repo
3. Find the X account(s) linked to the owner (and if that's an organisation, at least the core contributor, but if not, also look at top 50% contributors or so).
4. Use keywords within context of posts of X accounts to filter out threads that are relevant (without duplication).
5. Run a search on x with results of people mentioning the keyword(s) to find other mentions about this repo.

All of this should be done respecting privacy and with an xymake configuration in the repo. This will be a challenge, but very cool nonetheless!

# Ratelimiter is slow

Keep watching ratelimiter speed. Sorta slow sometimes, maybe ratelimt resets too fast which causes required reinitialisation which takes a bit longer?

# Process `.gitattributes`

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

https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage

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

# Improve GitHub URL to Zip mapping

Issue: not all branches are accessible yet on github and this is actually quite some logic! Many will actually give a dead link, which is problematic! Since we have more than zipobject alone for github zip finding, this should become a service or lib in itself. Maybe, its better not to allow github URL in the first place, or at least, we should be very clear on what is supported from the github URL structure and what isn't.

Possible github URLs in browser:

- https://github.com/facebook/react
- https://github.com/facebook/react/tree|blob/main/[path]
- https://github.com/facebook/react/wiki/[page]
- https://github.com/facebook/react/tree/18eaf51bd51fed8dfed661d64c306759101d0bfd
- https://github.com/facebook/react/tree/gh/mvitousek/5/orig/compiler (branch can have strange characters including `/`)
- https://github.com/facebook/react/tree/v16.3.1 (it's a tag)

Two strategies are possible to figure out the zip url and raw url:

1. trial and error; try most likely and try other possibilities later to finally get the zip url. the tricky part is that https://codeload.github.com/facebook/react/zip/refs/ANYTHING will always redirect even if it didn't exist, so we need to follow the redirect.
2. use `git.listServerRefs`. If we cache it and But this easily takes half a second...

It's best to create a function to do this trial and error. This would most likely just be ratelimited by 5000 req/hour/ip. Additionally we could cache the tagnames and branchnames - but not the shas they're tied to. However, I don't think this is worth the additional complexity as the amount of trials before a hit is likely between 2-3 on average (assuming we start with 2 in parallel).

# UIT cli

Installs context from url into standard location `.rules`

# version selectors

- a github repo has branches and versions
- a npm package has versions
