# lists

![](ingestlist.drawio.svg)

How would I be able to make this idea performant?
https://github.com/stars/{username} is the base of the url structure we wanna support

https://uithub.com/stars/janwilmake would provide all starred repos + details + lists + details, and support available filters too

https://uithub.com/stars/janwilmake/lists/{list-id}[/{page}/{branch}[/{repo}/...]] would provide all repos with branch {branch}

Ideally we'd create several parallel pipes for filters, and stream them back into 1 result. This parallelization would keep things super fast.

In the end, this type of search would be ideally be applicable to generated lists as well, not just github lists. This is a very interesting feature that would set uithub apart and create unfair advantage (as repoprompt, gitingest, etc, wouldn't be easily able to do this)

# How to fetch from infinite zip files?

1. Have the ability to store an ingestion result in a DOFS (zip -> search -> transform)
2. In a worker or queue, spawn n DOs that perform an entire ingestpipeline each
3. Use alarms to keep resetting DO CPU time so it doesn't crash.
4. Immediately keep connection open with 6 DOs simulataneously (max 6 requests) and stream out the result until complete. The worker would allow to combine max 499 DOs, and then provide (max 1000 requests)

This extra storage step into a DOFS adds a lot of complexity (Step 1 is already hard) but would allow much faster searches across large amounts of repos. Doing something like this would proof the power of serverless.

# Simplified version:

With this basically only the basePath is different and the same UI could be used for it.

1. Based on list ID, retrieve owner/repo pairs
2. Create zipurl, ingestzip-url, and search-url, transform url for it (based on the page) - this should be a function to easily generate such url and used here as well as in uithub itself for a single zip.
3. Use `uithub.merge` with all the above urls. This would ouptut 1 FormData stream.
4. Now the ouptut format shall be determined (e.g. outputmd/outputjson applied) and it gives a single markdown/json!

🤔 Lets try the above first and allow navigating in the uithub interface to any list. Super dope!
