https://uuithub.com/janwilmake/uit/tree/main/uithub.ingestzip

just like this, make a lib called ingestjson that gets passed a json url, fetches the json into memory, then turns it into files by walking over it in this way:

if the shape of the json is { files: {[path:string]: {type:"binary"|"content", content?:string, url?:string} }, the paths are determined like that, the content comes from either content or url depending on type.

if not, the values in the first level of the json (must be object or array) will be the files. the filename is either the slug, id, or the index of the value, appended with .json

after determining the paths, the path filters are applied (in the same way as ingest zip). the output is a FormData stream with x-error and x-filter in the same way as ingestjson (x-filter if filtered out)
