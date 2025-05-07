export type Env = { CREDENTIALS: string };

export interface FilterOptions {
  omitFirstSegment: boolean;
  omitBinary: boolean;
  enableFuzzyMatching: boolean;
  rawUrlPrefix: string | null;
  basePath: string[];
  pathPatterns: string[];
  excludePathPatterns: string[];
  maxFileSize: number | undefined;
  itemTemplate?: string[];
  columnTemplate?: string[];
}

export interface ResponseOptions {
  boundary: string;
  isBrowser: boolean;
  authHeader: string | null;
}

export interface RequestParams {
  sqlUrl: string;
  filterOptions: FilterOptions;
  responseOptions: ResponseOptions;
}

export interface StreamRecord {
  type: "columns" | "row" | "meta" | "error";
  data?: any[] | { rows_read: number; rows_written: number };
  error?: string;
}

export interface ColumnTemplate {
  columnName: string;
  pathTemplate: string;
}

export interface ProcessedRow {
  index: number;
  data: any[];
  columns: string[];
}
