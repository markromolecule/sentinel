import { z } from '@hono/zod-openapi';

export type PaginationMetadata = {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
};

export type PaginatedResult<T> = {
    items: T[];
    pagination: PaginationMetadata;
};

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().openapi({
        description: 'Page index to fetch.',
        example: 1,
    }),
    pageSize: z.coerce.number().int().min(1).max(100).optional().openapi({
        description: 'Number of items per page.',
        example: 20,
    }),
    limit: z.coerce.number().int().min(1).max(100).optional().openapi({
        description: 'Alias for pageSize (number of items per page).',
        example: 20,
    }),
});

export const paginationMetadataSchema = z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
    hasMore: z.boolean(),
});

/**
 * Paginates an in-memory list using page and pageSize query parameters.
 *
 * If pagination parameters are omitted, the original list is returned unchanged.
 * When only one of `page` or `pageSize` is provided, the missing value falls back to
 * `1` or `20` respectively so clients can request a page without repeating the page size.
 *
 * @param items - The full list of items to paginate.
 * @param page - Optional 1-based page number.
 * @param pageSize - Optional page size (default 20, max 100).
 * @returns The original list or a paginated result wrapper.
 */
export function paginateItems<T>(
    items: T[],
    page?: number,
    pageSize?: number,
): T[] | PaginatedResult<T> {
    if (page === undefined && pageSize === undefined) {
        return items;
    }

    const resolvedPage = page ?? 1;
    const resolvedPageSize = pageSize ?? 20;
    const offset = (resolvedPage - 1) * resolvedPageSize;
    const paginatedItems = items.slice(offset, offset + resolvedPageSize);
    const totalPages = Math.ceil(items.length / resolvedPageSize);

    return {
        items: paginatedItems,
        pagination: {
            page: resolvedPage,
            pageSize: resolvedPageSize,
            total: items.length,
            totalPages,
            hasMore: offset + paginatedItems.length < items.length,
        },
    };
}

/**
 * Narrows a paginated result union into the wrapped shape.
 *
 * @param result - Array or paginated wrapper returned by `paginateItems`.
 * @returns True when the result contains pagination metadata.
 */
export function isPaginatedResult<T>(
    result: T[] | PaginatedResult<T>,
): result is PaginatedResult<T> {
    return !Array.isArray(result);
}
