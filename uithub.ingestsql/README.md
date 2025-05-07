# ingestsql

Relevant context:

- https://raw.githubusercontent.com/janwilmake/uit/refs/heads/main/README.md
- https://uuithub.com/janwilmake/uit/tree/main/uithub.ingestzip?excludePathPatterns=*.html
- https://raw.githubusercontent.com/janwilmake/dorm/refs/heads/main/public/openapi.json

Input:

1. pathname contains a URL - `basePath`, which is a DORM Query URL. This sql server endpoint should follow the DORM API spec `GET /query/raw/QUERY` and support response content-type `application/x-ndjson` (StreamResponse)
2. a `x-source-authorization` (optional) which is passed as Authorization header to the sql server, if given
3. optional: a query param (can be string[]) `?itemTemplate` that contains an encoded string with the path for each item, where {property} will be replaced by the returned item property for all properties present.
4. optional: a query param (can be string[]) `?columnTemplate` that contains format `{columnName}:{pathTemplate}` that would put the result of the column in a file on the filled path. If the result is a URL, it will be set to x-url instead of the file contents, which will be made empty.
5. same query parameters as `ingestzip` (but not genignore)

Process:

- Executes the provided basePath with accept `application/x-ndjson` with the proper authorization header. Validates whether the response is valid or not (return early if not)
- Streams in the desired files based on `itemTemplate` and `columnTemplate`. Also applies query parameters in exactly the same way as in ingestzip
- Does not implement genignore.ts or genignore filter, this isn't needed for ingestsql
- output a FormData stream of files

It implements this in `types.ts` and `main.ts` and a spec of it `openapi.json` hosted at ingestsql.uithub.com
