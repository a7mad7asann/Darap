export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  requestId: string;
}

export interface ApiErrorResponseEnvelope {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId: string;
}

export interface PaginationParamsDto {
  page?: number;
  limit?: number;
}

export interface PaginatedResultDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
