# uithub output md

Please generate a typescript cloudflare worker with the following specification

- `export default { fetch }` syntax
- use `/// <reference types="@cloudflare/workers-types" />` and `//@ts-check` at the start
- use `multipart-formdata-stream-js` package

Context:

- https://ingestzip.uithub.com/openapi.json
- https://raw.githubusercontent.com/janwilmake/multipart-formdata-stream-js/refs/heads/main/README.md
- https://raw.githubusercontent.com/janwilmake/multipart-formdata-stream-js/refs/heads/main/cloudflare/types.d.ts

# Specification:

- Retrieves `/{formDataUrl}?maxTokens=number&maxFileSize=number` from request (default: 50k maxTokens, 50kb maxFileSize)
- Streams in form data using `iterateMultipart` and for every part:
  - Determine if it's a binary by looking at content-transfer-encoding (matching "binary")
  - For encountered file, generate markdown content:
    - for binary, show `x-url` or message 'binary file ommitted'
    - if file too large, print 'file too large' for content
    - for code files, print code in codeblock with extension after the tripple backtick
    - otherwise just put the content after the filename
  - Write the tree to the readable stream directly
    - uses unix text-style tree syntax. assume files stream in alphabetically
  - Sum up total tokens and stops after maxTokens is reached
  - Store content in markdown format until the whole tree has been written
- After maxTokens are reached or all files have been processed, output markdown (after tree).
- After all content, print a final message: "The content has been capped at {number} tokens and a max file size of {number} bytes. Please apply other filters to refine your result.:"

# Background

The goal of outputmd.uithub.com is to generate a markdown file for LLMs to process of any file system that has the file hierarchy tree first and the contents after. The problem with this though is that the tree is often at the end of the file (such as with zip). We therefore must first save the content in memory. Since LLMs can't process more than 50k tokens anyway, it's not a problem for this to be kept in memory as we won't run into memory limits.

I've considered different - more complex - implementations that would stream the tree at the same time as the file contents, but this is not deemed necessary since the tree does not need to contain more files than the content input stream.
