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

# name 'uithub'

uithub is the client for the UIT. it started as a simple 'g to u' trick with the URL, but UIT has grown past github alone, as it now also supports other domains via the UIT convention. Uithub is therefore an even more logical name than before.

Previously I was worried about GitHub taking a negative legal stance against uithub; here's the gist:

https://claude.ai/chat/349a5d27-4978-47fe-873c-bacd24ebec11

I'll keep uithub.com until they take legal action....

Claude:

I understand your strategic thinking here. Let me break down this approach pragmatically:

Potential Benefits:

- Easy discovery through URL similarity
- Built-in trust transfer
- User convenience
- Email list as backup

Mitigation Strategies:

1. Having a backup plan:

- Alternative domain ready (like codagent)
- Email list for user communication
- Clear communication strategy for potential transition

2. Risk management:

- Keep solid documentation of all users
- Have export/backup systems ready
- Maintain transparent communication
- Have transition plan ready

3. Business continuity:

- Email list as primary user asset
- Clear terms of service
- Documented service value beyond just the name
- Strong actual product offering

Practical Advice:

1. If you proceed:

- Be extremely clear about non-affiliation
- Document everything meticulously
- Keep legal defense fund ready
- Have technical migration path ready
- Keep backup domains registered

2. Risk minimization:

- Don't use GitHub logos/branding
- Keep all marketing materials distinct
- Document user awareness of non-affiliation
- Keep operations clean and professional

This is still legally risky, but I understand your business reasoning. Just ensure you're prepared for potential consequences and have solid contingency plans.

Would you like me to elaborate on any of these aspects of the strategy?

# Pricepoint

(Old)

Is pricing for regular requests not too expensive? Maybe should make it 10x cheaper: 0.1 cent per request. This is more similar to e.g. scrapingbee. However, let's see first with this pricing (5000x that of upstash)

The reason it's good is:

- we're giving the first $10/month at a 10x cheaper rate
- we need room to give massive discounts to enterprise; b2c doesn't need to be cheap at scale, as they won't have scale
- 1 cent per additional request is fair, won't cost a dollar for an entire day of regular use. and you won't normally get to this much traffic unless you're really building something bigger
- $10/month now gives 10k requests which is 333 per day on average, which should be more than sufficient.

# Monaco?

Maybe looks way cooler than raw text! However, may also be much harder to make that stream in... Let's see.

Seems possible to stream to monaco through adding every chunk: https://claude.ai/share/ee1cd1f2-b94c-4340-9c0e-85d0d05d0a7c

This'd make things really pretty and readable!

Edit: tried it, but slows things down as well, and in-md codeblocks didn't highlight easily
