export type StandardURL = {
  /**
   * If given, will be used to ingest the data
   *
   * If not given, the ingestUrl will be the same route (with accept application/form-data) */
  sourceUrl: string;
  sourceType: "zip" | "json" | "tar" | "formdata";

  // This is all to render the frontend
  omitFirstSegment?: boolean;
  primarySourceSegment: string;
  pluginId?: string;
  secondarySourceSegment?: string;
  basePath?: string;
  ext?: string;
  ogImageUrl?: string;
  title?: string;
  description?: string;
  rawUrlPrefix?: string;
  baseLink: string;
  moreToolsLink?: string;

  /** Optional: a record map of basePaths (without '/' prefix) and the values being menu titles */
  navigation?: Record<string, string>;
};
