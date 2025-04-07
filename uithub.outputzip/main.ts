// Constants for ZIP file structure
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP_VERSION = 0x0a; // Version 1.0
const ZIP_VERSION_NEEDED = 0x0a; // Version 1.0
const ZIP_FLAG = 0x0000; // No flags
const ZIP_METHOD_STORED = 0x0000; // Stored (no compression)
const ZIP_METHOD_DEFLATED = 0x0008; // Deflated

interface ZipEntry {
  name: string;
  data: Uint8Array;
  offset: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  method: number;
  time: number;
  date: number;
}

/**
 * Converts FormData stream to a ZIP file
 */
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // Check request method
    const method = request.method.toUpperCase();

    if (method !== "GET" && method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Authenticate the request
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return new Response("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="FormData to ZIP Converter"',
        },
      });
    }

    // Verify credentials
    const credentials = atob(authHeader.substring(6));
    if (credentials !== env.CREDENTIALS) {
      return new Response("Invalid credentials", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="FormData to ZIP Converter"',
        },
      });
    }

    let formDataStream: ReadableStream<Uint8Array>;
    let boundary: string;

    // Handle GET request - fetch FormData from URL
    if (method === "GET") {
      // Extract URL from pathname
      const url = new URL(request.url);
      const fullUrl = url.pathname.substring(1) + url.search;
      if (!fullUrl) {
        return new Response("No URL provided", { status: 400 });
      }

      try {
        const response = await fetch(fullUrl, {
          headers: {
            Authorization: authHeader,
          },
        });

        if (!response.ok) {
          return new Response(
            `Failed to fetch data: ${response.status} ${response.statusText}`,
            {
              status: 502,
            },
          );
        }

        // Get content type and boundary
        const contentType = response.headers.get("content-type") || "";
        const boundaryMatch = contentType.match(
          /boundary=(?:"([^"]+)"|([^;]+))/i,
        );

        if (!boundaryMatch || !response.body) {
          return new Response("Invalid multipart response from source", {
            status: 502,
          });
        }

        boundary = boundaryMatch[1] || boundaryMatch[2];
        formDataStream = response.body;
      } catch (error: any) {
        return new Response(`Error fetching data: ${error.message}`, {
          status: 500,
        });
      }
    }
    // Handle POST request - use request body as FormData
    else {
      const contentType = request.headers.get("content-type") || "";
      const boundaryMatch = contentType.match(
        /boundary=(?:"([^"]+)"|([^;]+))/i,
      );

      if (!boundaryMatch || !request.body) {
        return new Response("Invalid multipart request body", { status: 400 });
      }

      boundary = boundaryMatch[1] || boundaryMatch[2];
      formDataStream = request.body;
    }

    // Process the FormData and create ZIP
    try {
      const zipStream = await createZipFromFormData(formDataStream, boundary);

      // Return the ZIP stream
      return new Response(zipStream, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="formdata.zip"',
        },
      });
    } catch (error: any) {
      return new Response(`Error processing data: ${error.message}`, {
        status: 500,
      });
    }
  },
};

/**
 * Creates a ZIP file from a FormData stream
 */
async function createZipFromFormData(
  formDataStream: ReadableStream<Uint8Array>,
  boundary: string,
): Promise<ReadableStream<Uint8Array>> {
  // Import multipart-formdata-stream-js dynamically
  const { iterateMultipart } = await import("multipart-formdata-stream-js");

  // Use TransformStream to process the data
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Process in background
  (async () => {
    try {
      const entries: ZipEntry[] = [];
      let currentOffset = 0;

      // Iterate through each part of the multipart form data
      for await (const part of iterateMultipart(formDataStream, boundary)) {
        // Process the part if it has a filename and data
        if (part.name && part.data) {
          const filename = part.filename || part.name;
          const data =
            part.data instanceof Uint8Array ? part.data : new Uint8Array(0);

          // Generate ZIP entry
          const entry = await processFileEntry(filename, data, currentOffset);
          entries.push(entry);

          // Write local file header and data
          const headerAndData = createLocalFileHeader(entry);
          await writer.write(headerAndData);

          // Update offset for next entry
          currentOffset += headerAndData.length;
        }
      }

      // Write central directory
      const centralDirectory = createCentralDirectory(entries);
      await writer.write(centralDirectory);

      // Write end of central directory record
      const endOfCentralDirectory = createEndOfCentralDirectory(
        entries,
        centralDirectory.length,
        currentOffset,
      );
      await writer.write(endOfCentralDirectory);

      // Close the writer
      await writer.close();
    } catch (error) {
      await writer.abort(error);
      throw error;
    }
  })();

  return readable;
}

/**
 * Process a file entry for the ZIP
 */
async function processFileEntry(
  filename: string,
  data: Uint8Array,
  offset: number,
): Promise<ZipEntry> {
  // Get current date/time
  const now = new Date();
  const time =
    ((now.getHours() << 11) |
      (now.getMinutes() << 5) |
      (now.getSeconds() >> 1)) &
    0xffff;
  const date =
    (((now.getFullYear() - 1980) << 9) |
      ((now.getMonth() + 1) << 5) |
      now.getDate()) &
    0xffff;

  // Compress the data using CompressionStream
  let compressedData: Uint8Array;
  try {
    const compressedStream = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      },
    }).pipeThrough(new CompressionStream("deflate-raw"));

    // Collect the compressed data
    const reader = compressedStream.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLength += value.length;
    }

    // Concatenate chunks
    compressedData = new Uint8Array(totalLength);
    let position = 0;
    for (const chunk of chunks) {
      compressedData.set(chunk, position);
      position += chunk.length;
    }
  } catch (error) {
    // Fall back to stored method if compression fails
    console.warn("Compression failed, using STORED method", error);
    compressedData = data;
    return {
      name: filename,
      data,
      offset,
      crc32: calculateCRC32(data),
      compressedSize: data.length,
      uncompressedSize: data.length,
      method: ZIP_METHOD_STORED,
      time,
      date,
    };
  }

  return {
    name: filename,
    data: compressedData,
    offset,
    crc32: calculateCRC32(data), // CRC is calculated on the uncompressed data
    compressedSize: compressedData.length,
    uncompressedSize: data.length,
    method: ZIP_METHOD_DEFLATED, // Use deflate method
    time,
    date,
  };
}

/**
 * Creates the local file header and data for a ZIP entry
 */
function createLocalFileHeader(entry: ZipEntry): Uint8Array {
  // Local file header size: signature(4) + version(2) + flag(2) + method(2) + time(2) + date(2) +
  // crc32(4) + compressedSize(4) + uncompressedSize(4) + filenameLength(2) + extraFieldLength(2)
  const filenameBuffer = new TextEncoder().encode(entry.name);
  const headerSize = 30 + filenameBuffer.length;
  const buffer = new ArrayBuffer(headerSize + entry.data.length);
  const view = new DataView(buffer);
  let offset = 0;

  // Local file header signature
  view.setUint32(offset, LOCAL_FILE_HEADER_SIGNATURE, true);
  offset += 4;

  // Version needed to extract
  view.setUint16(offset, ZIP_VERSION_NEEDED, true);
  offset += 2;

  // General purpose bit flag
  view.setUint16(offset, ZIP_FLAG, true);
  offset += 2;

  // Compression method
  view.setUint16(offset, entry.method, true);
  offset += 2;

  // Last mod file time
  view.setUint16(offset, entry.time, true);
  offset += 2;

  // Last mod file date
  view.setUint16(offset, entry.date, true);
  offset += 2;

  // CRC-32
  view.setUint32(offset, entry.crc32, true);
  offset += 4;

  // Compressed size
  view.setUint32(offset, entry.compressedSize, true);
  offset += 4;

  // Uncompressed size
  view.setUint32(offset, entry.uncompressedSize, true);
  offset += 4;

  // Filename length
  view.setUint16(offset, filenameBuffer.length, true);
  offset += 2;

  // Extra field length
  view.setUint16(offset, 0, true);
  offset += 2;

  // Filename
  new Uint8Array(buffer, offset, filenameBuffer.length).set(filenameBuffer);
  offset += filenameBuffer.length;

  // File data
  new Uint8Array(buffer, offset, entry.data.length).set(entry.data);

  return new Uint8Array(buffer);
}

/**
 * Creates the central directory for the ZIP file
 */
function createCentralDirectory(entries: ZipEntry[]): Uint8Array {
  // Calculate the total size of the central directory
  let totalSize = 0;
  for (const entry of entries) {
    const filenameLength = new TextEncoder().encode(entry.name).length;
    totalSize += 46 + filenameLength; // 46 is the size of the central directory header excluding filename
  }

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  for (const entry of entries) {
    const filenameBuffer = new TextEncoder().encode(entry.name);

    // Central directory header signature
    view.setUint32(offset, CENTRAL_DIRECTORY_SIGNATURE, true);
    offset += 4;

    // Version made by
    view.setUint16(offset, ZIP_VERSION, true);
    offset += 2;

    // Version needed to extract
    view.setUint16(offset, ZIP_VERSION_NEEDED, true);
    offset += 2;

    // General purpose bit flag
    view.setUint16(offset, ZIP_FLAG, true);
    offset += 2;

    // Compression method
    view.setUint16(offset, entry.method, true);
    offset += 2;

    // Last mod file time
    view.setUint16(offset, entry.time, true);
    offset += 2;

    // Last mod file date
    view.setUint16(offset, entry.date, true);
    offset += 2;

    // CRC-32
    view.setUint32(offset, entry.crc32, true);
    offset += 4;

    // Compressed size
    view.setUint32(offset, entry.compressedSize, true);
    offset += 4;

    // Uncompressed size
    view.setUint32(offset, entry.uncompressedSize, true);
    offset += 4;

    // Filename length
    view.setUint16(offset, filenameBuffer.length, true);
    offset += 2;

    // Extra field length
    view.setUint16(offset, 0, true);
    offset += 2;

    // File comment length
    view.setUint16(offset, 0, true);
    offset += 2;

    // Disk number start
    view.setUint16(offset, 0, true);
    offset += 2;

    // Internal file attributes
    view.setUint16(offset, 0, true);
    offset += 2;

    // External file attributes
    view.setUint32(offset, 0, true);
    offset += 4;

    // Relative offset of local header
    view.setUint32(offset, entry.offset, true);
    offset += 4;

    // Filename
    new Uint8Array(buffer, offset, filenameBuffer.length).set(filenameBuffer);
    offset += filenameBuffer.length;
  }

  return new Uint8Array(buffer);
}

/**
 * Creates the end of central directory record
 */
function createEndOfCentralDirectory(
  entries: ZipEntry[],
  centralDirectorySize: number,
  centralDirectoryOffset: number,
): Uint8Array {
  // End of central directory record size: signature(4) + diskNumber(2) + startDiskNumber(2) +
  // diskEntries(2) + totalEntries(2) + centralDirectorySize(4) + centralDirectoryOffset(4) +
  // commentLength(2)
  const buffer = new ArrayBuffer(22); // 22 is the size of the end of central directory record
  const view = new DataView(buffer);
  let offset = 0;

  // End of central directory signature
  view.setUint32(offset, END_OF_CENTRAL_DIRECTORY_SIGNATURE, true);
  offset += 4;

  // Number of this disk
  view.setUint16(offset, 0, true);
  offset += 2;

  // Disk where central directory starts
  view.setUint16(offset, 0, true);
  offset += 2;

  // Number of central directory records on this disk
  view.setUint16(offset, entries.length, true);
  offset += 2;

  // Total number of central directory records
  view.setUint16(offset, entries.length, true);
  offset += 2;

  // Size of central directory
  view.setUint32(offset, centralDirectorySize, true);
  offset += 4;

  // Offset of start of central directory
  view.setUint32(offset, centralDirectoryOffset, true);
  offset += 4;

  // Comment length
  view.setUint16(offset, 0, true);

  return new Uint8Array(buffer);
}

/**
 * Calculates CRC-32 checksum for data
 */
function calculateCRC32(data: Uint8Array): number {
  let crc = -1;
  const table = generateCRC32Table();

  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }

  return ~crc >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Generates CRC-32 lookup table
 */
function generateCRC32Table(): Uint32Array {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc;
  }

  return table;
}
