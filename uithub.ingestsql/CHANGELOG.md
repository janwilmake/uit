# First POC (2025-05-05)

I made this first version after being hyped up by https://x.com/benallfree who's working on a durable object file system (see https://x.com/benallfree/status/1919757983279677471). The first version had some problems though.

The problem with first version was that we couldn't leverage range and index match queries, which is very valuable but we are loosing. What if we could pass `/table-name[/indexed-column-name/match[/range]]`?

e.g. for https://github.com/janwilmake/hackernews-crawler/blob/main/main.ts, we get `/items/by/janwilmake`, `/items/time/202401010333/2025-010122233`, `/items/type/poll`, `/items/id/123456`, and we can even index more columns. This basically becomes a different source if done in this way, since we select just a single table, with or without match or range request, making it a lot faster as we can always use a range request easily by design of the URL.

Another big problem is that we can't know the table row size (can be up to 2mb for my source) and we don't currently stream responses, rather, we are sending it as JSON. A better solution potentially would be to be able to leverage the streaming rpc stuff, but extend that as API, such that we can determine early stop criteria on the other end, while streaming in every result asap. This could be done through SSE/JSONL events. This should probably be looked at a potential standard for.

# Second iteration (2025-05-07)

TODO:

- ✅ Created a new DORM version putting `exec` out of the DO boundary without altering the spec.
- ✅ Test with https://crawler.gcombinator.com to do a direct match on indexed column 'by'. How long does it take? **Query Duration: 0ms** but this doesn't work. But seems sub-second at least.
- ✅ Use GET https://dorm.wilmake.com/api/db/query/raw/QUERY as source.

This version relies on `dormroom@next` (v1) which implements `doStorage.sql.exec` outside of the durable object boundary, solving the second problem. The other big difference is that it can apply just a single query now, which is specified in the URL, along with filter params and a way to specify how the items turn into files.

This version allows full streaming without any query result size limitation, as well as full leveragability of SQL query efficiencies.

All in all, I think this is a better intermediate layer, where ultimately, the router that uses this as a source should apply the final path-to-source mapping. This final layer will have full control over how data is queried and how the files are then generated from it (to an extent). If more control is desired (e.g. we need multiple sources or we need to map results further), a FormData processing plugin can be made for that, ontop of ingestsql.

# TODO

- ✅ Specify how a domain router should work
- ✅ Try it with hackernews by tying its router to this instead, so I can has something similar to the actual hackernews routing.
- ✅ If that works, already make that accessible via `uuithub.com/news.ycombinator.com/*`
- ✅ Solve the plugin problem where that doesn't fit via a logical redirect (first segment becoming a plugin) if the path follows original HN. No redirect needed per se, as long as it has `pluginId` and `secondaryPageThing` while primary is empty. This way, navigation should work as desired.
- 🔥 HUGE HUGE HUGE. Once this works, I got the frontend for the DB, basically.
