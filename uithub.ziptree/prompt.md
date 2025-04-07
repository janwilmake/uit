# define problem

I have a unique problem I want to solve - I want to get the entries of a zip file by looking at the Central directory and EOCD at the end of the zip file, but I don't want to store anything in storage, and I only have 128MB memory on a cloudflare worker.. however the location where the zip is located doesn't support RANGE requests, and doesn't support content-size header. please reason about this, and suggest me the best solution that is the FASTEST for large zip files of up to 300MB

# ask to implement

ok. please implement this as a cloudflare worker, in a way where the pathname is the URL encoded zip URL, and optionally a authorisation header can be passed and provided to the zip location. the response should be a JSON sequence stream of all entries in the central directory.

# test

test if this implementation works and improve otherwise

# add caching layer

ok, this works. please add caching:

- add `const DISABLE_CACHE = false;` to easily toggle cache for testing
- `env.ZIP_CACHE` has a KV store. you can use `getWithMetadata` with "stream" format, and `put` functions from here.
- look for request `max-age` query parameter as well as `Cache-Control` header, and calculate max-age with that, defaulting to 0.
- if `max-age > 0` look for cache key `url:{zipUrl}` and compare the `metdata.createdAt` with max-age to determine to return it or not.
- use reponse ETag header and look up cache key `etag:{etag}` if url alone wasn't sufficient, return that if present.
- if cache wasn't hit, do regular processing and store `url:{zipUrl}` and `etag:{etag}` in KV, adding `metadata {createdAt}`

<!-- THIS DIDN'T WORK YET.. Maybe too much complexity at once. Think about how to layer this over! Maybe split it up, first doing etag cache, then adding URL-based cache over that. We should also be careful, not caching it if it's a private repo! -->
