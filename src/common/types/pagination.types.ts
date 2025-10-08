/**
 * Pagination response with native Cosmos DB continuation token support
 */
export interface PaginatedResponse<T> {
  /** Array of items for current page */
  data: T[];
  /** Total number of items (if available, otherwise undefined) */
  total?: number;
  /** Continuation token for fetching next page (from Cosmos DB) */
  continuationToken?: string;
  /** Whether there are more items to fetch */
  hasMore: boolean;
  /** Current page size */
  pageSize: number;
}

/**
 * Pagination query parameters
 */
export interface PaginationQuery {
  /** Maximum number of items to return per page (default: 50, max: 1000) */
  pageSize?: number;
  /** Continuation token from previous response to fetch next page */
  continuationToken?: string;
}
