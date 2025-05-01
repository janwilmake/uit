## uithub.ingestjson

This module retrieves a JSON file from a URL and transforms it into a hierarchical file structure following these rules:

1. **Key-based file extraction**:

   - If a key has a known extension (e.g., `config.js`, `data.json`), it becomes a file at that path
   - The value becomes the content, and the key is removed from the parent object

2. **Array and numeric key handling**:

   - Array items are saved as `{path}/{index}.json`
   - Object keys that are just numbers (e.g., `{"1": {...}}`) are treated similarly

3. **Primitive value handling**:

   - Strings/numbers/booleans are saved as `.txt` files
   - Objects/arrays are saved as `.json` files
   - If the key has a known extension, that extension is used instead

4. **Remaining content**:

   - After extracting all files, any remaining content in an object is saved as `index.json`

5. **Path handling**:
   - JSON paths become file paths in the FormData output
   - The module supports proper nesting of files in directories

The module implements the same filtering capabilities as `ingestzip` (using picomatch for pattern matching), except for options specific to ZIP files (omitFirstSegment, omitBinary, rawUrlPrefix).

All output is streamed as multipart/form-data with appropriate Content-Type headers, file hashes, and other metadata required by the UIT protocol.

## Example

Given a JSON structure like:

```json
{
  "config.js": "export default { version: '1.0' }",
  "data": {
    "users.json": [{ "name": "Alice" }, { "name": "Bob" }],
    "settings": {
      "theme.css": "body { color: blue; }"
    }
  }
}
```

The module would extract these files:

- `/config.js` - Contains `export default { version: '1.0' }`
- `/data/users.json` - Contains `[{"name": "Alice"}, {"name": "Bob"}]`
- `/data/settings/theme.css` - Contains `body { color: blue; }`

Each file would be properly formatted with appropriate Content-Type headers and other metadata according to the UIT protocol.
