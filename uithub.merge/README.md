Cloudflare Typescript Worker with `export default { fetch }` that takes and combines multiple JSON Streams into one.

# TODO:

alter `uithub.merge` to:

- allow adding prefix
- define concurrency (one by one applies sorting automatically, and maybe its better anyway to not create too much backpressure)

# Definition

Env:

- CREDENTIALS: basic credentials in format `username:password`

Context:

- https://zipstream.uithub.com/openapi.json

Input:

- if `method:GET`: Two or more URLs (query param `url: string[]`) that return a Content JSON Sequence Stream.
- if `method:POST`: body {url:string,Authorization?:string,pathPrefix?:stirng}[]
- Basic Authorization header. Will be passed on to every URL unless given by POST method.
- `collisionStrategy` (query param)
  - (default): "ignore" - ignores paths with names already counted
  - "keep" - just passes duplicate names on (has potential to corrupt downstream)
  - "number" - will number files with same name (abc, abc2, abc3, abc3, etc.)

Process:

- credentials must match `env.CREDENTIALS` otherwise 401 with `www-authenticate`
- Will stream all into the same response in parallel, but keeps a counts object for file paths so far and apply the right `collisionStrategy` and pathPrefix.

Output:

- The same JSON sequence stream format
- If request came from a browser, use content-type `text/plain`, otherwise json stream contenttype. for both, add `charset=utf8`.
