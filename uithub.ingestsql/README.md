# ingestsql

Relevant context:

- https://raw.githubusercontent.com/janwilmake/uit/refs/heads/main/README.md
- https://uuithub.com/janwilmake/uit/tree/main/uithub.ingestzip?excludePathPatterns=*.html
- https://uuithub.com/janwilmake/dorm/tree/main/public/openapi.json

`ingestsql` works by being passed a sql server `basePath` (the server should follow the DORM API spec), a `x-source-authorization` (optional), and it then:

- uses the api to determine the available tables and which column is most likely the path (usually called `id,` but it should just be the first index)
- uses the query parameters in exactly the same way as in ingestzip, but try applying it in the sql layer as much as possible. ensure to paginate with limit such that the total response size never gets over 1000 rows each time.
- does not implement genignore.ts or genignore filter, this isn't needed for ingestsql
- turn every table row that is not filtered out into a `.json` file, ensure the path is prefixed with the name of the table, and suffixed with `.json` (if not already in the path)
- output a FormData stream of files

It implements this in `types.ts` and `main.ts` and a spec of it `openapi.json` hosted at ingestsql.uithub.com
