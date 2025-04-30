# `.genignore`

Genignore is an proposal to standardardize how to specify which files are to be ignored for generative AI. Any implementation of genignore should follow the same spec as gitignore: https://git-scm.com/docs/gitignore

Repomix [uses](https://github.com/yamadashy/repomix/blob/main/src/core/file/fileSearch.ts) `.repomixignore`, gitingest [has considered](https://github.com/cyclotruc/gitingest/issues/147) `.gitingestignore`. UIT implements it using `.genignore` and I hope other context selection tools will follow.

# context.json

`context.json` is a new proposed standard for managing multiple LLM contexts and providing metadata for creating AI and human interfaces to find context. [context.schema.json](https://github.com/janwilmake/uit/blob/main/uithub/static/context.schema.json)
