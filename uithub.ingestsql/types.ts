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

export interface SqlTable {
  name: string;
  columns: string[];
  pathColumn: string;
}

export interface SqlQueryResult {
  columns: string[];
  rows: any[][];
  meta: {
    rows_read: number;
    rows_written: number;
  };
}

export interface SqlResponse {
  result: SqlQueryResult;
}

export interface SqlRecord {
  table: string;
  data: Record<string, any>;
  path: string;
}

export interface TableStats {
  name: string;
  totalRows: number;
  processedRows: number;
}

export interface CompiledMatchers {
  inclusionMatchers: {
    normal: Array<(path: string) => boolean>;
    basename: Array<(basename: string) => boolean>;
  };
  exclusionMatchers: {
    normal: Array<(path: string) => boolean>;
    basename: Array<(basename: string) => boolean>;
  };
  hasInclusion: boolean;
  hasExclusion: boolean;
}
