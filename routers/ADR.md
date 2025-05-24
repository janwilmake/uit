# uit.com

If i have uit.com, this can become easier, as https://uithub.com can redirect to uit.com/github/... and we don't need to have the owner/repo thing.

url convention idea: https://x.com/janwilmake/status/1908066262514848040

# backtracking

The simple convention could be the following, like i also planned for zipobject:

- uit/x/dhh/lists --> https://xymake.com/dhh/lists/archive.zip or https://xymake.com/dhh/archive.zip#lists

What's useful about this is that xymake can choose to cache things at a more nested level for optimal efficiency.

# modularity of routing different domains

There's different ways to structure this:

- as independently hosted workers
- as packages
- as part of uithub

The decision on how to do this isn't easy. Ultimately, a lot of people might be making their own routers that may be dynamically added to the uithub explorer. However, this is currently far from the case. At this point I am the only maintainer, and it's just easier to invite people to make PRs than it is to ask them to make and serve indepdenent workers.

The advantage of independent worker code would be that deployment can be done independently, however, it's also a worse developer experience, and it's possible that it makes it slower (if you bind workers, the advantage of independent deployment goes away).

The advantage of packages would be that they are automatically installed/runnable when you install uithub locally, and they can be independently maintained. The disadvantage is that it adds a lot of friction for myself.

The advantage of making it just a part of uithub explorer is that it stays very simple. Location of behavior is super dense, making it easy to maintain from a single maintainer perspective.
