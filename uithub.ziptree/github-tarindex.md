Problem: having access to all events is great, but it's better to focus strongly so we can optimise for completing the entire cycle. Let's focus on repos that use Cloudflare for its deployment.

1. use github tar-link to get the central index cheaply from the static file based off just the `owner/repo` info without api usage.
2. a single queue batch can process up to 1000 repos with a filter on the path (or even filtering inside). If 100k repos change in 1 hour, we can search through all of them in just a queue of 100! cheap!

This would allow github-based auto-discovery by having a set of search patterns that people can add (and, potentially pay for).

First goal: every hour, detect all repos with wrangler.json/jsonc/toml, vercel.json, openapi.json/yaml and add/update these to a durable object dataset for each.

Finding after trying this:

- GitHub doesn't support range requests for their archives, so we can't easily get the central directory of the zip file (which is located at the end).
- The order of github repos is unfortunately not first all root files; only dot-folders and special files such as README come first, but after that, everything is alphabetical.
- This means it'd take a long time to analyse every repo that is pushed to for their config files. especially files like package.json and wrangler.toml aren't at the start, but come alphabetical and are usually somewhere in the middle of the zip or tarfile.
- It'd be possible to use raw.githubusercontent.com to check individual files like `package.json`, but we'd be quickly ratelimited since the official limti is 5000 requests per hour per IP address.

All in all, the only way to know whether or not a repo has a `wrangler.toml` we'd need to either use `raw.githubusercontent.com` which does not easily scale to 200k repos in an hour, or we'd need to download the entire dataset 200k repos every hour, just to get the file hierarchy. Since this seems unfeasible (too expensive), we'd need to consider the following:

- filter on metadata of the push event; however, apart from names of users, orgs, repos, and email of the committer, and message of the commits, there's not much to go on. There's no other metadata available here on the repo.
- focus more strictly on push events of users which we know to work with Serverless.
- GitHub search is not a solution; When trying `author:threepointone path:"wrangler.toml"` I get "The author qualifier is not supported when searching code."

An interesting idea may be to take more time and focus on active repos. In a given month, maybe there are 10M unique repos that are pushed to. Analysing 10M unique repos with a 5MB average size and 2 seconds per repo on average, would take 20.000.000 seconds of wall-clock time (and cpu time) and this would cost $32. Therefore, for $32 we'd know which owners ship wrangler.toml's. Follow-up months would be cheaper.

It's not guaranteed that github will allow us to do this, btw.

Another thing I could do: focus on small repos!

The size or language isn't mentioned in push-events, but `PullRequestEvent` do have all repo details including size and language! This could be an interesting way to filter.

Conclusion:

STEP 1: build a list of interesting owners to follow for free, and cut off on max size. also allow users to register their owner easily by just visiting a URL.

STEP 2: ensure to only analyse these owners on the file and content level with specific filters such as `wrangler.toml` or `.github/funding.yml`.
