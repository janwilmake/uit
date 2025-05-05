# plugin ideas

## ingest plugin ideas

- ingestjsonl - every jsonl becomes a file
- ingestjsonref - uses $ref to index jsons recursively or with given amount of layers
- ingestopenapi - uses a standardised way of pulling from an api operation with provided input
- ingestr2/ingests3 - https://developers.cloudflare.com/r2/data-catalog/
- ingestkv
- ingestredis
- ingestfs - should use node to ingest files from the file system with 1:1 spec similarity compared to ingestzip
- ingestsql - creates a connection, inspects, then streams out the data, turning every table into one or multiple json files
- ingestgit

## transformation plugins

- transformfile - transforms a single file based on an openapi operation

## output plugins

- outputyaml - turn the data into yaml format
- outputfs - nodejs
- outputr2/outputs3/outputkv/outputdofs - write to cloud file storage
- outputgit - push the result to a git repository
- outputapi - push the result to an api

# limitations

For KV and R2, i'm severely limited by the max amount of subrequests (1000 for the paid plan). I therefore am unable to easily retrieve all files in a worker and stream them out, this would only be possible if ingested from a browser.
