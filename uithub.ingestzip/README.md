# uithub zipstream

Implements zip -> multipart/form-data without filters.

# TODO:

Takes 2 minutes for bun. speed can likely be improved down to about 15-40s. see https://claude.ai/share/d4059e61-7ab8-404a-b5cd-f4dc2823101c

# Definition

Context: NONE!

I need a Typescript Cloudflare worker:

Input:

- `export default { fetch }` typescript worker. type ctx as any since it's not available by default
- Authentication: confirm the authorization basic header is present and provided encoded credentials match `env.CREDENTIALS`. If not, return 401 with www-authenticate header.
- method GET: Takes a zip URL as pathname, and an optional `x-source-authorization` header.
- method POST: request body should contain a zip stream.

Process:

- allow `?omitFirstSegment=true`. if given, will remove first segment of the path from the output (still start with `/`)
- Also allow `?rawUrlPrefix` that, when given, does not include contents in response for binary files, but rather provides `x-url` header for these. still show text contents! Always try decoding it as utf8 (`new TextDecoder("utf-8", { fatal: true, ignoreBOM: false })`) and if it fails it means it's binary.
- Uses web standards to read the zip file contents looking at the file boundaries. use first principles and stream and process files in parallel as soon as they come in. optimise for low-memory!
- Uses `DecompressionStream("deflate-raw")` to handle deflation of archive
- Streams the output as a `multipart/form-data` stream to the response. Ensure to put the path in the content-disposition "filename". ensure to add content-type, content-length, x-file-hash, and content-transfer-encoding as well.
- if request is made from a browser, ensure to respond with text/plain but keep the boundary and charset=utf8.. if not browser: multipart/form-data. ensure to pass a filename too for non-browser requests
- don't use crypto library to make hash, use web standards

NB: A stream-oriented approach that minimizes buffer copies would likely show significant performance improvements. Focus on performance and minimal memory pressure

# ADR

It's VERY IMPORTANT to provide GOOD INSTRUCTIONS. I got stuck because I assumed `fflate` was good for the job and wanted it to use it. It followed my instructions but got stuck because it didn't want to tell me it couldn't be done in that way! When I got clearer on the goal and gave it more freedom, it succeeded.
