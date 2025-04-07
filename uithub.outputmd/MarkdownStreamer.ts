import { Transform } from "node:stream";
import { FileEntry, StreamHandlerOptions } from "./types.js";
import { parseEntry } from "./parseEntry.js";

type NestedObject<T = null> = {
  [key: string]: NestedObject<T> | T;
};

const CHARACTERS_PER_TOKEN = 5;

function nestedObjectToTreeString<T>(
  obj: NestedObject<T>,
  prefix: string = "",
  isLast: boolean = true,
): string {
  let result = "";
  const entries = Object.entries(obj);

  entries.forEach(([key, value], index) => {
    const isLastEntry = index === entries.length - 1;
    const newPrefix = prefix + (isLast ? "    " : "│   ");

    result += `${prefix}${isLastEntry ? "└── " : "├── "}${key}\n`;

    if (typeof value === "object" && value !== null) {
      result += nestedObjectToTreeString(
        value as NestedObject<T>,
        newPrefix,
        isLastEntry,
      );
    }
  });

  return result;
}

function filePathToNestedObject(paths: string[]): NestedObject<null> {
  const result: NestedObject<null> = {};

  for (const path of paths) {
    let parts = path.split("/");
    parts = parts[0] === "" ? parts.slice(1) : parts;

    let current: NestedObject<null> = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = null;
      } else {
        current[part] = (current[part] as NestedObject<null>) || {};
        current = current[part] as NestedObject<null>;
      }
    }
  }

  return result;
}

interface SizeStats {
  totalFiles: number;
  files: number;
  totalTokens: number;
  tokens: number;
  characters: number;
  lines: number;
}

interface StoredFile {
  path: string;
  entry: FileEntry;
}

export class MarkdownStreamer extends Transform {
  private files: StoredFile[] = [];
  private fileCount = 0;
  private totalCharacters = 0;
  private totalLines = 0;

  constructor(private options: StreamHandlerOptions) {
    super({ objectMode: true });
  }

  private calculateSizeStats(): SizeStats {
    const stats: SizeStats = {
      totalFiles: this.fileCount,
      files: this.fileCount,
      totalTokens: Math.ceil(this.totalCharacters / CHARACTERS_PER_TOKEN),
      tokens: Math.ceil(this.totalCharacters / CHARACTERS_PER_TOKEN),
      characters: this.totalCharacters,
      lines: this.totalLines,
    };
    return stats;
  }

  private stringifyFileContent(path: string, entry: FileEntry): string {
    const contentOrUrl =
      entry.type === "content"
        ? entry.content
        : entry.type === "binary"
        ? entry.url
        : "";
    return `${path}:\n${"-".repeat(80)}\n${contentOrUrl}\n\n\n${"-".repeat(
      80,
    )}\n`;
  }

  async _transform(
    chunk: { path: string; entry: FileEntry },
    encoding: string,
    callback: Function,
  ) {
    // Parse the content if applicable
    const parsedEntry = parseEntry(
      chunk.path,
      chunk.entry,
      this.options.plugins,
      this.options.searchRegex,
    );

    // Store the file and update counts
    this.files.push({ path: chunk.path, entry: parsedEntry });
    this.fileCount++;

    if (parsedEntry.type === "content" && parsedEntry.content) {
      this.totalCharacters += parsedEntry.content.length;
      this.totalLines += parsedEntry.content.split("\n").length;
    }

    callback();
  }

  _flush(callback: Function) {
    let output = "";

    // Start with size stats
    const stats = this.calculateSizeStats();
    output += `${JSON.stringify(stats, null, 2)}\n\n`;

    // Add tree if not omitted
    if (!this.options.shouldOmitTree) {
      const paths = this.files.map((file) => file.path);
      const tree = filePathToNestedObject(paths);
      output += `${nestedObjectToTreeString(tree)}\n`;
    }

    // Add files if not omitted
    if (!this.options.shouldOmitFiles) {
      this.files.forEach((file) => {
        output += this.stringifyFileContent(file.path, file.entry);
      });
    }

    this.push(output);
    callback();
  }
}
