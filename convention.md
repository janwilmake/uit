# `.genignore`

`.genignore` is a proposal to standardardize how to specify which files are to be ignored for generative AI. Any implementation of genignore should follow the same spec as gitignore: https://git-scm.com/docs/gitignore

Repomix [uses](https://github.com/yamadashy/repomix/blob/main/src/core/file/fileSearch.ts) `.repomixignore`, gitingest [has considered](https://github.com/cyclotruc/gitingest/issues/147) `.gitingestignore`, repoprompt [uses](https://repoprompt.com/docs#s=file-selection&ss=filtering-files) `.repo_ignore`, cursor [uses](https://docs.cursor.com/context/ignore-files) `.cursorignore`.

uithub implements a slightly simplified version of `.genignore`: only the `.genignore` at the root is applied. I hope other context selection tools will do the same. Everyone can just add support for `.genignore` besides their own way, to give maintainers the choice to immediately support all tools.

# File filter params

UIT plugins are incentivized to stay as close to the base params as possible when possible. The following filter params are proposed to be standardized as filter parameters. any `ingest` plugin should implement them:

- `basePath:string[]` - only include files in these basePath(s)
- `pathPatterns:string[]` - glob pattern(s) of paths to be included
- `excludePathPatterns:string[]` - glob pattern(s) of paths to be excluded
- `enableFuzzyMatching` - use fuzzy matching (a la VSCode) if provided
- `omitBinary:boolean` - omit binary files if true
- `maxFileSize:number`
- `genignore:boolean` - whether or not to apply (default) `.genignore`

# `context.json`

`context.json` is a new proposed standard for managing multiple LLM contexts and providing metadata for creating AI and human interfaces to find context. [context.schema.json](https://github.com/janwilmake/uit/blob/main/uithub/static/context.schema.json)
