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
  jsonUrl: string;
  filterOptions: FilterOptions;
  responseOptions: ResponseOptions;
}
