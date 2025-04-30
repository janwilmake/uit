# file filter params

UIT plugins are incentivized to stay as close to the base params as possible when possible. The following filter params are proposed to be standardized as filter parameters:

- `pathPatterns:string[]` - glob pattern(s) of paths to be included
- `excludePathPatterns:string[]` - glob pattern(s) of paths to be excluded
- `maxFileSize:number`
- `genignore:boolean` - whether or not to apply (default) `.genignore`

# `.genignore`

Genignore is an proposal to standardardize how to specify which files are to be ignored for generative AI. Any implementation of genignore should follow the same spec as gitignore: https://git-scm.com/docs/gitignore

Repomix [uses](https://github.com/yamadashy/repomix/blob/main/src/core/file/fileSearch.ts) `.repomixignore`, gitingest [has considered](https://github.com/cyclotruc/gitingest/issues/147) `.gitingestignore`.

uithub implements a slightly simplified version of `.genignore`: only the `.genignore` at the root is applied. I hope other context selection tools will do the same.

# context.json

`context.json` is a new proposed standard for managing multiple LLM contexts and providing metadata for creating AI and human interfaces to find context. [context.schema.json](https://github.com/janwilmake/uit/blob/main/uithub/static/context.schema.json)
