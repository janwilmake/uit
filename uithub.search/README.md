# uithub search

Try it: http://localhost:3000/https://ingestzip.uithub.com/https://github.com/janwilmake/forgithub/archive/refs/heads/main.zip?basePath=forgithub-main/README.md

http://localhost:3000/https://ingestzip.uithub.com/https://github.com/janwilmake/fetch-each/archive/refs/heads/main.zip?basePath=/README.md&omitFirstSegment=true&basePath=/examples&rawUrlPrefix=https://raw.githubusercontent.com/janwilmake/fetch-each/refs/heads/main

## Definition

I want a Typescript Cloudflare worker with `export default { fetch }` that implements the following API:

Context:

- https://ingestzip.uithub.com/openapi.json (downstream api to be used using `env.API.fetch`)
- https://uithub.com/isaacs/minimatch/blob/main/README.md (npm package "minimatch" is installed)
- https://uithub.com/janwilmake/multipart-formdata-stream-js/tree/main/cloudflare?lines=false (how to use `multipart-formdata-stream-js`)

Env:

- CREDENTIALS: basic credentials in format username:password
- API: Fetcher

Process:

- Validates basic credentials and returns with 401 www-authenticate incase invalid
- Streams in the formdata from ingestzip using `multipart-formdata-stream-js` (or a compatible API)
- Use all filters to omit files. Use minimatch for globs.
- Stream out the resulting readable stream.

Required params

| Parameter       | in       | Description                                                                         |
| --------------- | -------- | ----------------------------------------------------------------------------------- |
| `url`           | pathname | URL that responds with a FormData stream. May include username:password credentials |
| `Authorization` | header   | Basic authentication credentials                                                    |

Filters

| Query Parameter    | Description                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disableGenignore` | Disables adhering to `.genignore` from repo or default `.genignore`                                                                                             |
| `maxFileSize`      | Maximum file size to include (in bytes)                                                                                                                         |
| `search`           | A text/pattern to search for in the file content. Must be base64 encoded and urlEncoded (e.g. "encodeURIComponent(btoa(your_regex))")                           |
| `isRegex`          | Boolean to enable 'search' using regex. Default: false                                                                                                          |
| `isCaseSensitive`  | Boolean to enable/disable case sensitivity for 'search'. Default: false                                                                                         |
| `isMatchWholeWord` | Boolean to match complete words only for 'search'. Default: false                                                                                               |
| `isFirstHitOnly`   | If given, will stop streaming after a first hit is found.                                                                                                       |
| `maxTokens`        | Maximum number of tokens allowed in the response. Parse will stop including files after this number of tokens. Tokens is calculated as `contentString.length/5` |
