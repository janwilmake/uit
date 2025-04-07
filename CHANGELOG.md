## POC (2025-04-02)

In the POC I want to focus on processing GitHub archives in this 4 step and making it available through the new uithub interface. The components needed are:

- `uithub.tree`: zip to tree-json-sequence
- `uithub.ingestzip`: zip to content-json-sequence
- `uithub.search`: apply standard search-filters (jsonseq->jsonseq)
- `uithub.merge`: turn potentially multiple json sequences into 1
- `uithub.outputmd`: double stream json seq into a markdown with tree with sizes first, content last.
- `uithub`: couples the above based on URL path with filters and presents resulting tree and md in HTML, adding ratelimiting, authentication, and monetisation.

TODO:

- ✅ come up with the right JSON Sequence datastructure with minimal loss of information of all origin formats. see what I had in zipobject and zipobject.tree
- ✅ implement `ingestzip`
- ✅ implement search
  - ✅ lookup filters definitions zipobject
  - ✅ create definition in markdown for that with appropriate context
  - ✅ generate `jsonseq->jsonsec`
- ✅ implement merge
  - ✅ spec

# Output zip (2025-04-04)

✅ Implement `outputzip` to easily go from zip to zip in a streaming fashion

✅ Confirm its fast and immediately streams the zip through 2 layers

# FormData POC (2025-04-04)

- Make all endpoints accept POST with body without adding too much complexity. Keep definition leading
  - ✅ ingestzip
  - ✅ search
  - ✅ outputzip
- ✅ Implement clever URL logic on this: `/[domainOrOwner]/[repoOrId][.ext]/tree/[(shadow)branch]/[basePath]`. See `convention.md` for how exactly.
- ✅ I can now use `main.ts` for the markdown chain to go from any `storage --> formdata -> search [-> transform] -> zip`
  - ✅ it works from and to zip with direct streaming WITH BUN 🎉
  - ❌ with search in between it breaks now
  - ✅ try search via post first via node js fn
  - ✅ figure out if search has proper error handling
  - ✅ if search works, see if 3-step pipe works.
  - ✅ see if it also works in prod
  - ✅ see if it als works for bun
- ✅ Goal: https://uit.uithub.com/oven-sh/bun.zip/tree/main?basePath=/docs would immediately start streaming the zip.
- ✅ Improve url pattern more.
- ✅ Goal today: visit https://pipe.uithub.com/oven-sh/bun instantly get the first 50k tokens streamed back.

![](forgithub.context.drawio.png)

# UITHUB FRONTEND (2025-04-05?)

See `uithub` repo
