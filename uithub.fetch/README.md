I can imagine that paralelization while streaming in a file hierarchy would be great as well. For example, we could use an api for processing any file hierarchy so each transformation is carried out elsewhere. This way, it can be divided over much more compute.

To be able to paralellize work on file hierarchies, one approach could be to use something like https://github.com/janwilmake/fetch-each or https://github.com/janwilmake/dodfetch

- As FormData streams in, it gets batched and added to a queue
- The queue has a max-batch size of 6 and each message executes the predetermined fetch with the file as body as post request with the appropriate headers.
- After filtering or transforming, the endpoint would output `multipart/formdata` (one or multiple files), and this could stream back into this module via a durable object.

This hasn't been connected yet, but it's actually perfect to tie this into https://github.com/janwilmake/filetransformers

If you're interested in this, let's chat!
