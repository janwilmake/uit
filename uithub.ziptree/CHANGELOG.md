# 2025-03-20

Tree data

- ✅ Ensure `forgithub.tree` outputs the token-tree in JSON
- ✅ Add caching via cache-control (also for private, with appropriate headers!)
- ✅ Migrate to `zipobject.tree` (more general, more better)
- ✅ Prefix endpoint with `/tree/{zipUrl}`
- ✅ Protect with admin secret
- ✅ Proxy from zipobject under endpoint `/tree/{url}` to tree.zipobject.com so there will be monetisation here.
- ✅ copy/paste openapi
- ✅ In uithub, use zipobject api!
- ✅ (sponsorflare: ensure API secret shows in dashboard zipobject! people should be able to use it)

# 2025-04-06

- ✅ Added admin-level basic auth
- ✅ Added KV layer to cache result based on cache control header.
- ✅ Ensure to store all required data for all types while always adhering to desired output type from a single kv entry
- ✅ Ensure output takes into account `basePath` and `omitFirstSegment` while cache is universal
- TODO: Add URL KV caching and "etag" KV caching back zips without authentication (for private repos we don't want responsibility so only private cache-control header is ok)
- TODO: Respond with x-first-segment in a response header (this can be used to determine the branch if not given)
