## ADR / Decisions

### 2025-04-01 - Supporting binary data?

My initial decision when I started to build `uit` was to use JSON Sequence as the core format.

Support for processing binary data would at first be done using references over URL (raw.githubusercontent.com incase of github). Later we can add support for streaming binary data by indicating the length of binary in a json sequence item, after which the raw binary data will be streamed. See this [claude convo](https://claude.ai/share/b162b3c7-8996-4d08-9b38-e2af2e5e5e6c)

However, after an enlightening conversation with the great https://x.com/zplesiv, I decided to t may be better to use Multipart FormData https://claude.ai/chat/1c647deb-a65a-49f7-89fc-b1092e375328 https://claude.ai/share/8bbab353-d07b-4d50-a173-02084d0b2fbb !! This can also be streamed! https://github.com/ssttevee/js-multipart-parser/tree/master !! The advantage is that binary data will be better supported out of the box. Also, this is kind of markdown already, which is quite cool.

- ✅ built simplified library based off of https://github.com/ssttevee/js-multipart-parser for most easy use, anywhere.
- ✅ Create a guide specifically for Cloudflare Workers.
- ✅ redo uithub.ingestzip using this guide, see if it actually streams as `multipart/formdata`.
- ✅ redo uithub.search to output MultiPart formdata.

# 2024-11 - name 'uithub'

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

# 2024-11 - Pricepoint (Old)

Is pricing for regular requests not too expensive? Maybe should make it 10x cheaper: 0.1 cent per request. This is more similar to e.g. scrapingbee. However, let's see first with this pricing (5000x that of upstash)

The reason it's good is:

- we're giving the first $10/month at a 10x cheaper rate
- we need room to give massive discounts to enterprise; b2c doesn't need to be cheap at scale, as they won't have scale
- 1 cent per additional request is fair, won't cost a dollar for an entire day of regular use. and you won't normally get to this much traffic unless you're really building something bigger
- $10/month now gives 10k requests which is 333 per day on average, which should be more than sufficient.

# 2025-04 - Monaco?

Maybe looks way cooler than raw text! However, may also be much harder to make that stream in... Let's see.

Seems possible to stream to monaco through adding every chunk: https://claude.ai/share/ee1cd1f2-b94c-4340-9c0e-85d0d05d0a7c

This'd make things really pretty and readable!

Edit: tried it, but slows things down as well, and in-md codeblocks didn't highlight easily

# 2025-04-21 - Error handling

Error handling sucks. how to improve?

- ❌ Files that error out should maybe add `/.errors/extension-name/...path` files so errors can instantly be shown
- ❌ We could also conventionalize concatenating all errors and adding them as a last file. This would be
- ❌ Trailers (headers at the end) are another option so it doesn't become a file. However, this could be trickier working with.
- ✅ `x-error` with format `{module-id};{status};{message}` should be passed on and if encountered, shouldn't be filtered or processed, so we can see errors for every individual file, where they happened, and with what file input. Perfect! 😃

# 2025-04-21 - URL Chain Auth Pass Sucks & Need standardized way to charge

I now have a chain of urls that I pipe the request through, a "urlpipe". The problem now is auth should be passed all the way down the chain for this to work. This means I MUST own the hosting for this to be trustworthy. It would be much better if I could stream in the zip output into the last one and stream it back, just like that. Maybe this can be done by adding a temporary token to retrieve back the auth token on the other end, but that's also a lot of extra complexity.

I don't know yet.

Doing body-body pipe in a single worker may slow down things but haven't tested yet. In the end it may be better as data comes from any source. Try if I can get it to work, and benchmark on speed. AI should be able to get it done and generalize from an array of requests that should flow into each other with custom headers and query parameters.

If that does not work out, brainstorm to make URL chain more secure and scalable, less error-prone.

In devmode, it'd be very cool to be able to see the intermediate result for any request as an explorable hierarchy. We could do this by creating clones of the responses and streaming those into a zip which can be made viewable in the browser. However, this could be done with some sort of devtool, and does not need to be part of the spec.

URL Chain sucks because:

- It mixes query params. Can be seen as a regression OR a feature. Not a real problem yet, but could become one for larger pipes with third-party creators.
- It requires me to pass on the authorization header. The scope of the authorization should be as minimal as possible for each processor so this isn't ideal.

**Need standardized way to charge**

We cannot use x-price as response header as most servers would not know the exact price in the beginning. Besides that, there's no good way to track usage by which part of the chain right now.

Possible ways to solve it;

- ❌ Trailer (header at the end) that specifies total cost incurred **probably worst option since it'd have a single price at the end and connection could be closed early**
- ❌ Optional FormData header for `x-price` that accumulates over time so we know cost intermediate as well. When received formdata already contains this it shall just be ignored and overwritten.
- ✅ Server self-manages: Send along `x-monetary-url` header to server that it can use with sponsorflare to add balance from to themselves and deduct it from the user. Along with expected max cost based on size and openapi spec, this can be a great way, since it allows a lot of freedom on how to charge, while respecting privacy of the user.

✅ Proposed solution:

- At the start, create an OTP and send that along as x-source-authorization header
- Create a max-budget for the entire request and send that along as x-monetary-url header
- every module then uses the monetary url with the uit-murl service to withdraw the required amount
- the module that needs direct access to the source (ingestzip, for example) would use the x-source-authorization together with the otpproxy to retrieve the zip (can be done just once)

🔥 This looks very promising and I'll try to implement it this way using `uithub.murl` and `uithub.otp`.

# 2025-04-21 - No easy getting started / docs

How to run uithub and improve individual components locally? How to easily develop a new plugin?

- Try right now to clone uit and make it easy to run locally. A fallback on the individual services would be great, not requiring running them per se.
- Figure out if I can do a check whether or not service-bindings are connected. If possible, make hostname a configurable setting, and make service binding connection optional falling back to regular fetch.
- Ideal situation: you only need to run 1 service (uithub) to run locally, and switch to any additional service to use it as part of the pipeline.

# github master zip redirect

Master redirects to production branch. does master always redirect to the deafult branch?????? for zip, maybe https://github.com/cloudflare/cloudflare-docs/archive/refs/heads/production.zip but for other things, definitely not.

# 2025-04 - Pricing / ratelimiting

Based on what should plugins be free:

- repos over 1000 stars

Based on what should features require pay-as-you-go

- private repos
- organisation repos
- repos under 1000 stars

The premium features should require deposit of $50

Also add button to unlock for entire organisation/owner (contact me)

# UIT vs. ActionSchema

Actionschema was json-based and because of it, it got the side effects of state at arbitrary public urls. this protocol potentially removes this problem using the formdata standard, while also making things stream through more easily, by design. They're two different beasts that solve the problem in different ways.

Let's lay them against each other and figure out how they measure up and how we can get the best of both worlds, in one.