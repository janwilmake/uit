# Zipobject Tree

This implementation provides a Cloudflare Workers-based API that efficiently extracts and returns the directory structure of ZIP files as a JSON Sequence and then into several JSON formats. It's optimized for use with services like GitHub that may not support range requests.

## Key Features

- Uses range requests when available for optimized performance
- Falls back to sequential processing when range requests aren't supported (e.g., on GitHub)
- Focuses on maximum efficiency by targeting the central directory at the end of ZIP files
- Supports caching via cache-control header. When zip-api-key is provided, cache-control will be private.

## REST API Usage

### Basic Request

```
GET https://tree.zipobject.com/{zip_url}
```

Where `{zip_url}` is the URL-encoded path to the ZIP file you want to analyze.

This implementation provides an efficient way to explore ZIP file contents without downloading the entire file, making it especially useful for large archives or bandwidth-constrained environments.

# IDEA: GitHub Global File Path Search

Goal: build a super efficient file path search that has a decent level of up-to-date-ness.

To build a database of all repos with a certain tree (and maybe more metadata), we need to Build a worker with a queue that gets the tree for all unique repos pushed, every hour.

Unique repos pushed to is about 100k, so this could cause a large amount of requests to the public zip archives of github. However, following hours are going to be much more efficient.

To prevent problems with github and/or cloudflare, we need to ensure we don't keep bashing the zip archives. If we receive a 429 back from github, let's listen to that here.

One queue batch can do 995 requests to https://tree.forgithub.com, apply filters for each of them, and push the result to a DOFS for a particular filter. If we do this at a large scale and https://tree.forgithub.com is cached at an R2 object (free reads) we would just pay for worker invocation cost which is $0.40 for 1 billion reads of the R2. If there are 100M repos total in our R2, and we need to run a search over that, this can be done for $0.04 + $0.04 per year to keep it up-to-date. If my S3 is fresh, theoretically it can also be done within just a few minutes!
