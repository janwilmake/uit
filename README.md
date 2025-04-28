# UIT - Universal Information Terminal

- [![janwilmake/uit context](https://badge.forgithub.com/janwilmake/uit)](https://uuithub.com/janwilmake/uit)
- [X Thread](https://x.com/janwilmake/status/1915774892500300281)
- [Hackernews Thread](https://news.ycombinator.com/item?id=43793986)

UIT is a library for **performant, modular, low-memory** file processing at scale, in the Cloud. It works by offering a 4-step process to gather a file hierarchy from any desired modality, apply filters and transformations, and output it in any desired modality.

- **performance**: speed is of essence when navigating and searching through large amounts of data
- **low-memory** by applying streaming and parallelization we can run this in low-memory environments such as Cloudflare workers
- **modular**: modularity is beneficial because by making it composable we get a clear high-level overview of all building blocks. also, not all building blocks can be ran in the same runtime or location.

> [!IMPORTANT]
> This is an early pre-release. See [TODO](TODO.md) for current challenges. Try the demo at https://uuithub.com

UIT has come about after many iterations of the platform of [uithub](https://uithub.com), which started as a simple node-based parser of zipfiles. While building more and more features and add-ons, I found myself limited by the memory a lot as I was not streaming enough, and going back to JSON too early (because using the Streams API is tricky!). Thus, as features and complexity grew the need was born to create a more modular extensible architecture with good serverless practices in mind.

![](process-formdata.drawio.png)

`FormData` has a long history [[RFC 1867 (1995)](https://datatracker.ietf.org/doc/html/rfc1867)] [[RFC 2388 (1998)](https://datatracker.ietf.org/doc/html/rfc2388)] [[RFC 7578 (2015)](https://datatracker.ietf.org/doc/html/rfc7578)] and is deeply embedded into the web. It offers an excellent way to serve multiple files, binary and textual, over a single request. Although `FormData` does not support stream-reading directly from `Request` and other Web Standards yet, UIT leverages the fact that intermediate results can be read using the [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) using [multipart-formdata-stream-js](https://github.com/janwilmake/multipart-formdata-stream-js).

UIT cleverly modularizes filters and transformations on file hierarchies by providing an elegant way to combine multiple UIT 'modules' together to get to a final result. Every UIT 'module' can apply path filters, content filters, and content transformations, to change the files in the file hierarchy, all while streaming, and even merge multiple file hierarchies together in the blink of an eye.

# UIT Modules

So far, UIT provides the following modules that can be combined to create powerful file processing pipelines:

- [**uithub.ingestzip**](./uithub.ingestzip) - Ingests and processes ZIP files into normalized formdata format
- [**uithub.merge**](./uithub.merge) - Combines multiple formdata streams into a single unified stream
- [**uithub.outputmd**](./uithub.outputmd) - Transforms and outputs data as markdown files
- [**uithub.outputzip**](./uithub.outputzip) - Packages processed data into downloadable ZIP archives
- [**uithub.search**](./uithub.search) - Provides search capabilities across file hierarchies
- [**uithub.ziptree**](./uithub.ziptree) - Highly performant zip file-hierarchy extractor
- [**uithub.otp**](./uithub.otp) - Source proxy that generates an OTP to minimize secret exposure to other modules.
- [**uithub**](./uithub) - Brings several modules together, pipes through them, and shows in authenticated HTML interface.

Each module is designed to perform a specific step in the UIT 4-step process (ingest, filter/transform, merge, output) while maintaining performance and low memory usage.

It is important to note that each of these modules can be independently hosted as a cloudflare worker, but the spec doesn't require it to be hosted on Cloudflare per se, you can also host UIT modules in other runtimes, as long as it's compliant with the [UIT Protocol](#uit-protocol)

Please also note that above diagrams showcase many modules that haven't don't exist yet, but could be beneficial to exist. By Open Sourcing UIT, I hope to empower developers to add the modules they need.

# UIT Protocol

The UIT Protocol is the convention that characterizes any UIT module. As can be seen in the diagrams above, any UIT module must be one of these 4 module types:

- **ingest module** - streams any datastructure into a FormData stream
- **merge module** - streams several FormData sources into a single FormData stream
- **filter/transform module** - applies filters and transformations on files in a streaming fashion while in the FormData 'modality'.
- **output module** - streams a FormData stream into any desired datastructure

The only formalized convention/protocol you need to understand to create a UIT module, is which FormData headers UIT modules work with. These FormData headers can be divided into standard and non-standard (custom) headers:

# UIT FormData Headers

## Standard FormData Headers

| Header                        | Description                                                                                                                                                                                  | Required |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Content-Disposition**       | Contains `name` (should equal pathname) and `filename` (should equal pathname)                                                                                                               | Yes      |
| **Content-Type**              | Specifies the MIME type of the data                                                                                                                                                          | No       |
| **Content-Length**            | Indicates the uncompressed size of the data                                                                                                                                                  | No       |
| **Content-Transfer-Encoding** | Specifies how the data is encoded:<br>- `binary` (required for binary files)<br>- `8bit` (recommended for text-based/utf8 files)<br>- `quoted-printable`<br>- `base64`<br>- `7bit` (default) | No       |

## Non-Standard (Custom) Headers

| Header          | Description                                     | Format                           |
| --------------- | ----------------------------------------------- | -------------------------------- |
| **x-url**       | Specifies the URL that locates the binary file. | URL string                       |
| **x-file-hash** | Stores the hash of the file                     | Hash string                      |
| **x-error**     | Indicates processing error in the pipeline.     | `{plugin-id};{status};{message}` |
| **x-filter**    | Indicates a file got filtered out.              | `{plugin-id};{status};{message}` |

Important:

- In some cases it may be desired to omit the binary data and only leave the URL to locate the file.
- On error in a module, the original incoming file-content should be preserved. If encountered, shouldn't be filtered or processed, so we can see errors for every individual file, where they happened, and with what file input.
- On filtering in a module, the `FormData` can be passed on with `x-filter` but without content
- On renaming and/or transforming, `x-filter` does not need to be aplied.

<!-- think about x-rename response header for when a file is renamed (x-rename: {plugin-id};{original-path};{new-path}). This could be beneficial to track in complex pipelines -->

# Contributing to UIT & Plugin System

UIT aims to be a convention to streaming, filtering, and transforming binary and textual file hierarchies in the Cloud, and maintains a curated list of first-party and third-party libraries that can be included into any UIT data-transformation flow.

As a first step I aim to create a plugin system that allows doing file filters and transformations with ease from the uithub UI. For intended plugins, check out [plugins.json](uithub/public/plugins.json) and [the spec](uithub/public/plugins.schema.json).

[The multipart parser](https://github.com/janwilmake/multipart-formdata-stream-js) is designed to handle all `FormData` headers, including any non-standard ones, and can be a useful libary to create FormData filter/transformers. It extracts them from the raw header lines and makes them available in the Part object. The library also maintains the original `headerLines` as part of the parsed data structure.

Please open a discussion, issue, pull request, or [reach out](https://x.com/janwilmake) if you want a new module to be added to this list or have any unmet requirements. To create your own plugin, follow the [GETTING-STARTED.md](GETTING-STARTED.md) and [CONTRIBUTING.md](CONTRIBUTING.md). UIT is also looking for sponsors.

# Links

- [TODO.md](TODO.md)
- [BACKLOG.md](BACKLOG.md)
- [CHANGELOG.md](CHANGELOG.md)
- [ADR.md](ADR.md)
- [GETTING-STARTED.md](GETTING-STARTED.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [ATTRIBUTION.md](ATTRIBUTION.md)
- plugins [[html]](https://uuithub.com/plugins) [[md]](uithub/public/plugins.json)

# Community & Related work

- https://github.com/cyclotruc/gitingest
- https://github.com/yamadashy/repomix
- https://repoprompt.com
- https://github.com/wildberry-source/open-repoprompt
- https://dev.to/mnishiguchi/building-a-local-ai-friendly-code-viewer-inspired-by-uithub-24ll
- https://github.com/janwilmake/zipobject.vercel - earlier version intended to replace uithub, got too complex (not modular, hard to debug)

<!--

Might OSS Soon:

- https://github.com/janwilmake/shadowfs - similar ideas different angle
- https://github.com/janwilmake/filetransformers - similar ideas different angle
- https://github.com/tools-for-gh/uithub.v1 - uithub v1

-->

# License and Attribution

> [!IMPORTANT]
> MIT will be added after official launch

UIT is licensed under the [MIT License](LICENSE.md). While the license only requires preservation of copyright notices, we kindly request attribution when using this project. See [ATTRIBUTION.md](ATTRIBUTION.md) for guidelines on how to provide attribution.

~ Being made with ❤️ by [janwilmake](https://x.com/janwilmake)
