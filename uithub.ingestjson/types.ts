export type Env = { CREDENTIALS: string };

export interface FilterOptions {
  enableFuzzyMatching: boolean;
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
