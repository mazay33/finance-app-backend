export function mapToPaginationResponse<T>(data: T[], total: number, page: number, limit: number): { data: T[]; pagination: { page: number; limit: number; total: number } } {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
    },
  };
}
