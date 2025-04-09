# TODO

🤔 I feel like nerding out on this a bit and showing some love to my users... I still receive most of my praise for uithub. Let's keep working on it and make it an even better foundation!

1. ✅ make it usable and gather early feedback (silently open source it) (TARGET: april 8, 2025)
2. ✅ Rename all of zipobject to uithub. uithub means 'universal information terminal hub'
3. 🟠 Let's show some ppl and figure out what to do next!
4. Feature parity with v1
5. Deploy/transition (TARGET: april 18, 2025)
6. make it better, adding lots of new features.

# Feature Parity V1

- Should charge small fee for use of Uithub API with permanent 402 if balance under $ -5 or so
- Add https://www.simpleanalytics.com event if free plan, or add back google analytics (see: https://github.com/janwilmake/uithub.v1)
- Test `isRegex`
- Never hit white screen, 404/429/402 if needed
- Test payment flow
- Test speed with large repos and make it faster if deemed too slow
- JSON/yaml buttons don't work yet. should be an easy Claude prompt

# Go to market V2

- lets make this update every 6 hours: https://popular.forgithub.com
- let's add questions to each: https://questions.forgithub.com
- lets add top 500 to the landingpage!!!
- also add to the chat.forgithub.com landingpage
- make chat.forgithub.com fast
- from there, focus on optimising for the top 500. openapi, typedoc, etc.

This would be something I'm confident to ship and share with the world, fully replacing v1.

# Feedback tl;dr - open questions to make the marketplace work:

- error handling sucks. how to improve?
- no easy getting started/docs. how to run uithub and improve individual components locally? how to easily develop a new plugin?
- url chain auth pass sucks.
- need standardized way to charge

## Ideas

### Error handling

Error handling sucks. how to improve?

- Files that error out should maybe add `/.errors/...` files so errors can instantly be shown
- We could also conventionalize concatenating all errors and adding them as a last file
- Trailers (headers at the end) are another option so it doesn't become a file. However, this could be trickier working with.

### No easy getting started / docs

How to run uithub and improve individual components locally? how to easily develop a new plugin?

- Figure out if I can do a check whether or not service bindings are connected. If possible, make hostname a configurable setting, and make service binding connection optional falling back to regular fetch
- Instruct running and hosting all individual services on Cloudflare. Add 'deploy on cloudflare' buttons.

### URL Chain Auth Pass Sucks

Doing body-body pipe in a single worker may slow down things but haven't tested yet. In the end it may be better as data comes from any source. Try if I can get it to work, and benchmark on speed. AI should be able to get it done and generalize from an array of requests that should flow into each other with custom headers and query parameters.

If that does not work out, brainstorm to make URL chain more secure and scalable, less error-prone.

In devmode, it'd be very cool to be able to see the intermediate result for any request as an explorable hierarchy. We could do this by creating clones of the responses and streaming those into a zip which can be made viewable in the browser.

### Need standardized way to charge

We cannot use x-price as response header as most servers would not know the exact price in the beginning. Besides that, there's no good way to track usage by which part of the chain right now.

Possible ways to solve it;

- Server self-manages: Send along `x-monetary-url` header to server that it can use with sponsorflare to add balance from to themselves and deduct it from the user. Along with expected max cost based on size and openapi spec, this can be a great way, since it allows a lot of freedom on how to charge, while respecting privacy of the user.
- Trailer (header at the end) that specifies total cost incurred.
- Optional FormData header for `x-price` that accumulates over time so we know cost intermediate as well. When received formdata already contains this it shall just be ignored and overwritten.
