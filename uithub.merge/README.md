# TODO

Try the new definition. If it doesn't work out it's too complex, maybe don't support `outputStreamStrategy`; just have 1 concurrency if sort is desired. But try first because this could affect speed for slow streams greatly!

Another idea to think about is to do paralelization on subzips even without basePath, later merging it. Imagine performing a search query on 300 zips this way! Could be much better than merging before search/filters.

# Limitations

- max 1000 requests (max 1000 individual input streams)
- 1-6 concurreny does not allow for much paralelism

# Definition

Cloudflare Typescript Worker with `export default { fetch }` that takes and combines multiple FormData streams into one.

Env:

- CREDENTIALS: basic credentials in format `username:password`

Context:

- https://ingestzip.uithub.com/openapi.json
- https://raw.githubusercontent.com/janwilmake/multipart-formdata-stream-js/refs/heads/main/README.md
- https://raw.githubusercontent.com/janwilmake/multipart-formdata-stream-js/refs/heads/main/cloudflare/types.d.ts

Input:

- if `method:GET`: Two or more URLs (query param `url: string[]`) that return a Content FormData Stream.
- if `method:POST`: body `{url:string,Authorization?:string,pathPrefix?:stirng}[]`
- basic `Authorization` header
- query params (optional): `maxConcurrency` (number 1-6, default 1), `outputStreamStrategy`, `collisionStrategy`

Process:

- Authorization header must contain basic credentials that match `env.CREDENTIALS`, otherwise 401 with `www-authenticate`
- Will stream in based on the URLs (in parallel if `maxConcurrency` >1) and will determine the amount of streams to be started at once.
- To apply `collisionStrategy` will keep a `Record<string,number>` to count paths coming in to know what number to add when encountered before, or when to ignore.
  - "overwrite" (default) - overwrites file if path has already been written to
  - "ignore" - ignores file if path has already been written to
  - "number" - will add a number suffix to file with same path (e.g. path/to/file.txt, then path/to/file2.txt, etc.)

Output:

- Streams out the resuling FormData stream using `outputStreamStrategy` (use the `multipart-formdata-stream-js` iterate method for this)
  - "instant" (default) - will stream out files immediately as they come in
  - "sorted" - will wait for the first url to finish before starting outputting the second
- If request came from a browser, use content-type `text/plain`, otherwise json stream contenttype. for both, add `charset=utf8`.
