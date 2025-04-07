## ADR / Decisions

### 2025-04-01 - Supporting binary data?

My initial decision when I started to build `uit` was to use JSON Sequence as the core format.

Support for processing binary data would at first be done using references over URL (raw.githubusercontent.com incase of github). Later we can add support for streaming binary data by indicating the length of binary in a json sequence item, after which the raw binary data will be streamed. See this [claude convo](https://claude.ai/share/b162b3c7-8996-4d08-9b38-e2af2e5e5e6c)

However, after an enlightening conversation with the great https://x.com/zplesiv, I decided to t may be better to use Multipart FormData https://claude.ai/chat/1c647deb-a65a-49f7-89fc-b1092e375328 https://claude.ai/share/8bbab353-d07b-4d50-a173-02084d0b2fbb !! This can also be streamed! https://github.com/ssttevee/js-multipart-parser/tree/master !! The advantage is that binary data will be better supported out of the box. Also, this is kind of markdown already, which is quite cool.

- ✅ built simplified library based off of https://github.com/ssttevee/js-multipart-parser for most easy use, anywhere.
- ✅ Create a guide specifically for Cloudflare Workers.
- ✅ redo uithub.ingestzip using this guide, see if it actually streams as `multipart/formdata`.
- ✅ redo uithub.search to output MultiPart formdata.

### Auth

I now have a chain of urls that I pipe the request through, a "urlpipe". The problem now is auth should be passed all the way down the chain for this to work. This means I MUST own the hosting for this to be trust worthy. It would be much better if I could stream in the zip output into the last one and stream it back, just like that. Maybe this can be done by adding a temporary token to retrieve back the auth token on the other end, but that's also a lot of extra complexity.

I don't know yet.
