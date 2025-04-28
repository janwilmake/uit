# UITX

> [!IMPORTANT]
> Work in Progress

UITX makes `uit` available as a library. Use it as CLI and for programmatic use.

Usage:

- As CLI:`npx uitx .`
- As script: `npm i --save-dev uitx` and add `{ "scripts": { "llms": "uitx ." } }` to your package.json
- Programmatically: `npm i uitx` and `import { pipe } from "uitx";`

[Critics](https://x.com/samgoodwin89/status/1916638156776198340) wanted the context exploration as package manager installable library so they can use it without API key in their own projects running the code on their own servers. They have a point!

TODO:

- Create `ingestfs.ts` that turns `fs` into a FormData stream (with appropriate filters on paths)
- Make `uithub.outputmd` a package
- create a single package `uitx` that combines both in a single end to end pipeline that turns a basePath into a context on a single machine. Needs to work by providing `fs` and `basePath`. Needs to run anywhere.
