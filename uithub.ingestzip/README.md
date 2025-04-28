# uithub ingestzip

A Cloudflare Worker that processes ZIP archives and streams their contents as multipart/form-data responses, with powerful filtering options and optimized performance.

## Features

- **Streaming Architecture**: Processes ZIP files as streams for optimal memory usage and performance
- **Authentication**: Basic authentication support for secure access
- **Content Filtering**: Multiple filtering methods including path patterns, exclusions, and base paths
- **Binary File Handling**: Options to handle binary files differently from text files
- **Path Transformation**: Option to remove the first segment of file paths
- **Content Hashing**: Automatic SHA-256 hashing of file contents
- **Browser Compatibility**: Different response formats for browser vs. API clients

## Usage

### Authentication

All requests require Basic Authentication using the credentials configured in the `CREDENTIALS` environment variable.

### Request Methods

#### GET

```
https://your-worker.example.com/{url-encoded-zip-url}?[options]
```

- The ZIP URL should be URL-encoded and provided as the path
- You can optionally include an `x-source-authorization` header that will be passed to the ZIP URL request

#### POST (Not yet implemented)

Future support for direct ZIP upload in request body.

### Query Parameters

| Parameter               | Type    | Description                                                                                                                                      |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `omitFirstSegment`      | Boolean | When `true`, removes the first segment of each file path in the output                                                                           |
| `omitBinary`            | Boolean | When `true`, binary files will be excluded from the response                                                                                     |
| `rawUrlPrefix`          | String  | Base URL prefix for binary files. When provided, binary file contents are replaced with an `x-url` header pointing to `{rawUrlPrefix}{filePath}` |
| `basePath[]`            | String  | One or more base paths to filter on (filters applied after first segment omission if enabled)                                                    |
| `pathPatterns[]`        | String  | Glob patterns for files to include. Multiple patterns can be specified by repeating this parameter                                               |
| `excludePathPatterns[]` | String  | Glob patterns for files to exclude. Applied after `pathPatterns`                                                                                 |
| `enableFuzzyMatching`   | Boolean | When `true`, enables VSCode-like fuzzy matching for file paths                                                                                   |
| `maxFileSize`           | Number  | Maximum file size in bytes to include in the response                                                                                            |

### Response Format

The response is a multipart/form-data stream with the following characteristics:

- Each file in the ZIP is represented as a part in the multipart response
- File paths are included in the `Content-Disposition` header's filename attribute
- Each part includes `Content-Type`, `Content-Length`, `x-file-hash` (SHA-256), and `Content-Transfer-Encoding` headers
- For binary files with `rawUrlPrefix`, an `x-url` header is included instead of content
- Browser requests receive `text/plain` responses with the same boundary (for better compatibility)

## Examples

### Basic Usage

```
https://your-worker.example.com/https%3A%2F%2Fexample.com%2Farchive.zip
```

### Filter by Path Pattern

```
https://your-worker.example.com/https%3A%2F%2Fexample.com%2Farchive.zip?pathPatterns=*.js&pathPatterns=*.ts
```

### Exclude Binary Files and Use Raw URL Prefix

```
https://your-worker.example.com/https%3A%2F%2Fexample.com%2Farchive.zip?omitBinary=true&rawUrlPrefix=https://cdn.example.com/files
```

### Complex Filtering

```
https://your-worker.example.com/https%3A%2F%2Fexample.com%2Farchive.zip?basePath=src&pathPatterns=**/*.{js,ts}&excludePathPatterns=**/node_modules/**&omitFirstSegment=true&maxFileSize=1048576
```

## Implementation Notes

- Uses native Web APIs including `TransformStream` and `DecompressionStream`
- Early filtering at the ZIP reader level for improved performance
- Streaming architecture for minimal memory pressure
- SHA-256 hashing of file contents
- Glob pattern matching via picomatch
- Content type detection by file extension

## Future Enhancements

- Implement POST method for direct ZIP upload
- Add support for compressed response formats
- Implement cache control options
- Add additional authentication methods
