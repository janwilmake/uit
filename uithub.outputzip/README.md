To test:

http://localhost:3000/https://ingestzip.uithub.com/https://github.com/janwilmake/fetch-each/archive/refs/heads/main.zip?omitFirstSegment=true

DOES NOT WAIT: http://outputzip.uithub.com/https://ingestzip.uithub.com/https://github.com/facebook/react/archive/refs/heads/main.zip?omitFirstSegment=true

WAITS: https://pipe.uithub.com/facebook/react/tree/main

Limitations:

- max filesize ±50mb (must fit in memory with overhead)
- max central directory size: ±50mb (couple million files)

Not used:
https://raw.githubusercontent.com/gildas-lormeau/zip.js/refs/heads/master/README.md

Context used:

- https://ingestzip.uithub.com/openapi.json
- https://uithub.com/janwilmake/multipart-formdata-stream-js/tree/main?lines=false

Packages used:

- multipart-formdata-stream-js

Input:

- Authentication: confirm the authorization basic header is present and provided encoded credentials match env.CREDENTIALS. If not, return 401 with www-authenticate header.
- method GET: pathname should contain a URL that responds with a FormData stream similar to the output of ingestzip. pass on basic authentication here.
- method POST: request body should contain a FormData stream similar to the output of ingestzip.

Process:

- stream iterate over all formdata parts
- as the parts come in, write them as zip contents to a readablestream (CompressionStream with "deflate-raw")
- at the end, write the central directory and close the CompressionStream

Ouput:

- the output is the stream which contains the generated zip from the formdata

Please generate typescript Cloudflare worker (export default { fetch} syntax) that implements this above specification
