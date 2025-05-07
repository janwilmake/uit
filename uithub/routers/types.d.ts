export type StandardURL = {
  omitFirstSegment?: boolean;
  primarySourceSegment: string;
  pluginId?: string;
  secondarySourceSegment?: string;
  basePath?: string;
  ext?: string;
  sourceType?: SourceType;
  sourceUrl?: string;
  ogImageUrl?: string;
  title?: string;
  description?: string;
  rawUrlPrefix?: string;
  baseLink: string;
  moreToolsLink?: string;

  /** Optional: a record map of basePaths (without '/' prefix) and the values being menu titles */
  navigation?: Record<String<"basePath">, String<"menuTitle">>;
};

type String<TDescriptor> = string;

/** Ingestplugin is used */
export type SourceType = "zip" | "tar" | "json" | "sql";

export type Plugin = {
  disabled?: boolean;
  title: string;
  domain: string;
  type: [
    "ingest",
    "transform-file",
    "transform-formdata",
    "output",
    "storage",
    "workflow",
    "scope",
  ][number];
  description: string;
  endpoint: string;
  source: string;
};

export type OutputType = "zip" | "txt" | "json" | "yaml" | "md" | "git";
