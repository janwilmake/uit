/// <reference types="@cloudflare/workers-types" />
//@ts-check

/**
 * @typedef Env {object}
 * @property ZIPTREE_KV {KVNamespace}
 * @property SECRET {string}
 */

import { stringify } from "yaml";
import { streamZipFile } from "./streamZipFile";

const roundTokens = (count) => {
  if (count < 100) {
    return count;
  }
  if (count < 10000) {
    return Math.round(count / 100) * 100;
  }
  return Math.round(count / 1000) * 1000;
};

// Configuration
const DEFAULT_MAX_AGE = 86400; // 24 hours
const CHARACTERS_PER_TOKEN = 5;

export default {
  fetch: async (request, env, ctx) => {
    try {
      // Parse URL and extract path components
      const url = new URL(request.url);
      if (!url.pathname.startsWith("/tree/")) {
        return new Response("Usage: /tree/{zipUrl}", { status: 404 });
      }

      const isLocal = env.IS_LOCAL;
      const secret = request.headers
        .get("Authorization")
        ?.slice("Basic ".length);
      if (!env.SECRET && !isLocal) {
        return new Response("No secret set", { status: 500 });
      }

      const sourceAuthorization = request.headers.get("x-source-authorization");
      const zipUrl = decodeURIComponent(url.pathname.slice("/tree/".length));
      const type = url.searchParams.get("type");
      const basePath = url.searchParams.get("basePath");
      const omitFirstSegment =
        url.searchParams.get("omitFirstSegment") === "true";

      const accept =
        url.searchParams.get("accept") || request.headers.get("accept");

      // Fetch and process the repository tree
      return fetchTree(
        request,
        env,
        ctx,
        zipUrl,
        type,
        basePath,
        omitFirstSegment,
        accept,
        sourceAuthorization,
        secret,
      );
    } catch (error) {
      console.error("Error processing request:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: error.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
/**
 * Transforms a flat path-to-size mapping into a hierarchical tree structure
 * @param {Object} flatPaths - Object with paths as keys and sizes as values
 * @returns {Object} Hierarchical tree with _size property for each folder node
 */
function createTree(flatPaths) {
  const tree = { __size: 0 };

  // Iterate through each path in the flat structure
  for (const [path, size] of Object.entries(flatPaths)) {
    // Skip the path if it's empty
    if (!path) continue;

    // Remove leading slash if present
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;

    // Split the path into segments
    const segments = cleanPath.split("/");

    // Start at the root of the tree
    let currentNode = tree;

    currentNode.__size += size;

    // Navigate through path segments, creating nodes as needed
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];

      // Create the folder node if it doesn't exist
      if (!currentNode[segment]) {
        currentNode[segment] = { __size: 0 };
      }

      // Add this file's size to the current folder's _size
      currentNode[segment].__size += size;

      // Move to the next level in the tree
      currentNode = currentNode[segment];
    }

    // Add the file itself with its size
    const fileName = segments[segments.length - 1];
    currentNode[fileName] = size;
  }

  return tree;
}

/**
 * Determines the appropriate cache control directives to use
 * @param {Request} request - The original request
 * @param {URL} url - Parsed URL object
 * @param {string|null} apiKey - API key if provided
 * @returns {{maxAge:number, cacheControl:string,staleWhileRevalidate:number}} Object with maxAge and cacheControl string
 */
function getCacheControl(request, url, apiKey) {
  // Check query parameter first
  const queryMaxAge = url.searchParams.get("max-age");
  let maxAge = DEFAULT_MAX_AGE;

  if (queryMaxAge !== null) {
    const parsed = parseInt(queryMaxAge, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      maxAge = parsed;
    }
  }

  // Check Cache-Control header
  const requestCacheControl = request.headers.get("Cache-Control");
  if (requestCacheControl) {
    const match = requestCacheControl.match(/max-age=(\d+)/);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed >= 0) {
        maxAge = parsed;
      }
    }
  }
  const staleWhileRevalidate = 2592000;
  // Build cache control directive
  const directives = [
    `max-age=${maxAge}`,
    `stale-while-revalidate=${staleWhileRevalidate}`,
  ];

  // Add public/private directive based on API key presence
  if (apiKey) {
    directives.push("private");
  } else {
    directives.push("public");
  }

  return {
    staleWhileRevalidate,
    maxAge,
    cacheControl: directives.join(", "),
  };
}

/**
 *  * Fetches and processes zip tree data
 *
 * @param {Request} request
 * @param {Env} env
 * @param {*} ctx
 * @param {string} zipUrl
 * @param {string|null} type
 * @param {string|null} basePath
 * @param {boolean} omitFirstSegment
 * @param {*} accept
 * @param {string|null} sourceAuthorization
 * @param {string|undefined} secret
 * @returns {Promise<Response>} Processed tree data response
 */
async function fetchTree(
  request,
  env,
  ctx,
  zipUrl,
  type,
  basePath,
  omitFirstSegment,
  accept,
  sourceAuthorization,
  secret,
) {
  const cacheKey = `v3.ziptree:${zipUrl}/apiKey=${sourceAuthorization}`;

  /**
   * @type *
   */
  const already = await env.ZIPTREE_KV.get(cacheKey, "json");

  const url = new URL(request.url);
  const { cacheControl, maxAge, staleWhileRevalidate } = getCacheControl(
    request,
    url,
    sourceAuthorization,
  );

  if (already && already.createdAt > Date.now() - staleWhileRevalidate * 1000) {
    // already and not too old for showing stale version

    if (already.createdAt < Date.now() - maxAge * 1000) {
      // Too old to keep it like that; revalidate in the back
      ctx.waitUntil(
        streamTree(
          request,
          env,
          ctx,
          zipUrl,
          type,
          basePath,
          omitFirstSegment,
          accept,
          sourceAuthorization,
          cacheKey,
        ),
      );
    }

    // return it
    return finalResponse(
      already.result,
      type,
      basePath,
      omitFirstSegment,
      accept,
      cacheControl,
    );
  }

  if (!secret || atob(secret) !== env.SECRET) {
    return new Response("No cached version available and secret invalid", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Tree Access"',
      },
    });
  }

  // do it
  return streamTree(
    request,
    env,
    ctx,
    zipUrl,
    type,
    basePath,
    omitFirstSegment,
    accept,
    sourceAuthorization,
    cacheKey,
  );
}

/**
 * Fetches and processes zip tree data
 *
 * @param {Request} request
 * @param {Env} env
 * @param {*} ctx
 * @param {string} zipUrl
 * @param {string|null} type
 * @param {string|null} basePath
 * @param {boolean} omitFirstSegment
 * @param {*} accept
 * @param {string|null} sourceAuthorization
 * @param {string} cacheKey
 * @returns {Promise<Response>} Processed tree data response
 */
const streamTree = async (
  request,
  env,
  ctx,
  zipUrl,
  type,
  basePath,
  omitFirstSegment,
  accept,
  sourceAuthorization,
  cacheKey,
) => {
  const url = new URL(request.url);
  const { cacheControl, maxAge, staleWhileRevalidate } = getCacheControl(
    request,
    url,
    sourceAuthorization,
  );

  const response = await streamZipFile(zipUrl, sourceAuthorization);

  if (!response.ok || !response.body) {
    return new Response(
      JSON.stringify({
        error:
          response.status === 404
            ? `Zip not found ${zipUrl}`
            : "Error fetching repository structure",
        status: response.status,
      }),
      {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Get response as text and process it
  const reader = response.body.getReader();
  const { result, error } = await processZipEntries(reader);

  if (!result) {
    return new Response(error || "Something went wrong", { status: 500 });
  }
  // console.log({ result });
  console.log("result size", JSON.stringify(result).length);
  // cache result

  ctx.waitUntil(
    env.ZIPTREE_KV.put(
      cacheKey,
      JSON.stringify({ result, createdAt: Date.now() }),
      { expirationTtl: staleWhileRevalidate },
    ),
  );

  return finalResponse(
    result,
    type,
    basePath,
    omitFirstSegment,
    accept,
    cacheControl,
  );
};

/**
 *
 * @param {{[path:string]:{uncompressedSize:number,crc32:string}}} result
 * @param {string|null} type
 * @param {string|null} basePath
 * @param {boolean} omitFirstSegment
 * @param {string|null} accept
 * @param {string} cacheControl
 * @returns {Response}
 */
const finalResponse = (
  result,
  type,
  basePath,
  omitFirstSegment,
  accept,
  cacheControl,
) => {
  const stringifyFn = accept === "text/yaml" ? stringify : JSON.stringify;

  const finalResult = {};
  let firstSegment = "";

  Object.entries(result).forEach(([path, entry]) => {
    if (!firstSegment) {
      firstSegment = path.split("/")[0];
    }

    // first omit first segment
    let normalizedPath = omitFirstSegment
      ? prependSlash(path.split("/").slice(1).join("/"))
      : prependSlash(path);

    // then apply basePath path

    if (
      basePath &&
      !prependSlash(normalizedPath).startsWith(
        appendSlash(prependSlash(basePath)),
      )
    ) {
      // console.log({ normalizedPath, basePath });
      // filter out other base paths
      return;
    }

    normalizedPath = basePath
      ? prependSlash(normalizedPath.slice(prependSlash(basePath).length))
      : normalizedPath;

    const ext = path.split("/").pop()?.split(".").pop();

    const value =
      type === "crc32"
        ? entry.crc32
        : getSize(entry.uncompressedSize, ext, type);

    finalResult[normalizedPath] = value;
  });

  const final =
    type === "token-tree"
      ? stringifyFn(createTree(finalResult), undefined, 2)
      : stringifyFn(finalResult, undefined, 2);

  // console.log({ firstSegment });
  // Return the final processed data
  return new Response(final, {
    status: 200,
    headers: {
      "X-First-Segment": firstSegment,
      "Content-Type": accept === "text/yaml" ? "text/yaml" : "application/json",
      "Cache-Control": cacheControl,
    },
  });
};
const binaryExtensions = [
  "3dm",
  "3ds",
  "3g2",
  "3gp",
  "7z",
  "a",
  "aac",
  "adp",
  "afdesign",
  "afphoto",
  "afpub",
  "ai",
  "aif",
  "aiff",
  "alz",
  "ape",
  "apk",
  "appimage",
  "ar",
  "arj",
  "asf",
  "au",
  "avi",
  "bak",
  "baml",
  "bh",
  "bin",
  "bk",
  "bmp",
  "btif",
  "bz2",
  "bzip2",
  "cab",
  "caf",
  "cgm",
  "class",
  "cmx",
  "cpio",
  "cr2",
  "cur",
  "dat",
  "dcm",
  "deb",
  "dex",
  "djvu",
  "dll",
  "dmg",
  "dng",
  "doc",
  "docm",
  "docx",
  "dot",
  "dotm",
  "dra",
  "DS_Store",
  "dsk",
  "dts",
  "dtshd",
  "dvb",
  "dwg",
  "dxf",
  "ecelp4800",
  "ecelp7470",
  "ecelp9600",
  "egg",
  "eol",
  "eot",
  "epub",
  "exe",
  "f4v",
  "fbs",
  "fh",
  "fla",
  "flac",
  "flatpak",
  "fli",
  "flv",
  "fpx",
  "fst",
  "fvt",
  "g3",
  "gh",
  "gif",
  "graffle",
  "gz",
  "gzip",
  "h261",
  "h263",
  "h264",
  "icns",
  "ico",
  "ief",
  "img",
  "ipa",
  "iso",
  "jar",
  "jpeg",
  "jpg",
  "jpgv",
  "jpm",
  "jxr",
  "key",
  "ktx",
  "lha",
  "lib",
  "lvp",
  "lz",
  "lzh",
  "lzma",
  "lzo",
  "m3u",
  "m4a",
  "m4v",
  "mar",
  "mdi",
  "mht",
  "mid",
  "midi",
  "mj2",
  "mka",
  "mkv",
  "mmr",
  "mng",
  "mobi",
  "mov",
  "movie",
  "mp3",
  "mp4",
  "mp4a",
  "mpeg",
  "mpg",
  "mpga",
  "mxu",
  "nef",
  "npx",
  "numbers",
  "nupkg",
  "o",
  "odp",
  "ods",
  "odt",
  "oga",
  "ogg",
  "ogv",
  "otf",
  "ott",
  "pages",
  "pbm",
  "pcx",
  "pdb",
  "pdf",
  "pea",
  "pgm",
  "pic",
  "png",
  "pnm",
  "pot",
  "potm",
  "potx",
  "ppa",
  "ppam",
  "ppm",
  "pps",
  "ppsm",
  "ppsx",
  "ppt",
  "pptm",
  "pptx",
  "psd",
  "pya",
  "pyc",
  "pyo",
  "pyv",
  "qt",
  "rar",
  "ras",
  "raw",
  "resources",
  "rgb",
  "rip",
  "rlc",
  "rmf",
  "rmvb",
  "rpm",
  "rtf",
  "rz",
  "s3m",
  "s7z",
  "scpt",
  "sgi",
  "shar",
  "snap",
  "sil",
  "sketch",
  "slk",
  "smv",
  "snk",
  "so",
  "stl",
  "suo",
  "sub",
  "swf",
  "tar",
  "tbz",
  "tbz2",
  "tga",
  "tgz",
  "thmx",
  "tif",
  "tiff",
  "tlz",
  "ttc",
  "ttf",
  "txz",
  "udf",
  "uvh",
  "uvi",
  "uvm",
  "uvp",
  "uvs",
  "uvu",
  "viv",
  "vob",
  "war",
  "wav",
  "wax",
  "wbmp",
  "wdp",
  "weba",
  "webm",
  "webp",
  "whl",
  "wim",
  "wm",
  "wma",
  "wmv",
  "wmx",
  "woff",
  "woff2",
  "wrm",
  "wvx",
  "xbm",
  "xif",
  "xla",
  "xlam",
  "xls",
  "xlsb",
  "xlsm",
  "xlsx",
  "xlt",
  "xltm",
  "xltx",
  "xm",
  "xmind",
  "xpi",
  "xpm",
  "xwd",
  "xz",
  "z",
  "zip",
  "zipx",
];
const getSize = (uncompressedSize, ext, page) => {
  if (page !== "token-list" && page !== "token-tree") {
    return uncompressedSize;
  }
  const isBinary = binaryExtensions.includes(ext);
  if (isBinary) {
    return 0;
  }
  const count = Math.round(uncompressedSize / CHARACTERS_PER_TOKEN);
  return roundTokens(count);
};
const prependSlash = (path) => (path.startsWith("/") ? path : "/" + path);
const appendSlash = (path) => (path.endsWith("/") ? path : path + "/");
/**
 * Processes ZIP entries from the streaming response
 * @param {ReadableStreamDefaultReader} reader - Stream reader
 * @returns {Promise<{success:boolean,error?:string,result?: {[path:any]:string|number}}>} Processed tree data
 */
async function processZipEntries(reader) {
  const decoder = new TextDecoder();
  const result = {};
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    // Append new chunk to buffer and process
    buffer += decoder.decode(value, { stream: true });

    // Process complete lines
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line);

        if (entry.error) {
          // ensure proper error logging
          return { success: false, error: entry.error };
        }

        // Process only file entries (not directories or end records)
        if (
          entry.fileName &&
          !entry.isDirectory &&
          entry.type !== "end_of_central_directory"
        ) {
          // NB: ensure it doesn't get too big. We may need more properties later for other features, but lets keep it small
          result[entry.fileName] = {
            crc32: entry.crc32,
            uncompressedSize: entry.uncompressedSize,
          };
        }
      } catch (error) {
        console.error("Error parsing JSON entry:", error, line);
      }
    }
  }

  return { success: true, result };
}
