# plugin ideas

## ingest plugin ideas

- ingestjsonl - every jsonl becomes a file
- ingestjsonref - uses $ref to index jsons recursively or with given amount of layers
- ingestopenapi - uses a standardised way of pulling from an api operation with provided input
- ingestr2/ingests3 -
- ingestfs - should use node to ingest files from the file system with 1:1 spec similarity compared to ingestzip
- ingestsql - creates a connection, inspects, then streams out the data, turning every table into one or multiple json files
- ingestgit -

## transformation plugins

- transformfile - transforms a single file based on an openapi operation

## output plugins

- outputyaml - turn the data into yaml format
- outputfs - nodejs
- outputr2/outputs3/outputkv/outputdofs - write to cloud file storage
- outputgit - push the result to a git repository
- outputapi - push the result to an api
