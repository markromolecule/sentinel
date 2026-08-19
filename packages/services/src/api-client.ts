export interface ApiClientOptions extends RequestInit {
    baseUrl?: string;
    getToken?: () => Promise<string | null | undefined>;
}

export class ApiError extends Error {
    status: number;
    statusText: string;
    body?: unknown;

    constructor({
        message,
        status,
        statusText,
        body,
    }: {
        message: string;
        status: number;
        statusText: string;
        body?: unknown;
    }) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
}

function mapEndpointQueryParams(endpoint: string): string {
    const queryStartIndex = endpoint.indexOf('?');

    if (queryStartIndex === -1) {
        return endpoint;
    }

    const pathname = endpoint.slice(0, queryStartIndex);
    const searchParams = new URLSearchParams(endpoint.slice(queryStartIndex + 1));
    const limit = searchParams.get('limit');

    if (limit !== null) {
        searchParams.delete('limit');
        searchParams.set('pageSize', limit);
    }

    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
}

function mapPaginationMetadata<T>(payload: T): T {
    if (typeof payload !== 'object' || payload === null) {
        return payload;
    }

    if (!('pagination' in payload)) {
        return payload;
    }

    const pagination = (payload as { pagination?: unknown }).pagination;

    if (
        typeof pagination !== 'object' ||
        pagination === null ||
        !('pageSize' in pagination) ||
        'limit' in pagination
    ) {
        return payload;
    }

    return {
        ...(payload as Record<string, unknown>),
        pagination: {
            ...(pagination as Record<string, unknown>),
            limit: (pagination as { pageSize: unknown }).pageSize,
        },
    } as T;
}

/**
 * Creates a fetch wrapper that normalizes pagination query and response shapes.
 *
 * Request queries using `limit` are rewritten to `pageSize` so the backend can
 * keep a single pagination contract, while JSON responses with `pagination.pageSize`
 * gain a compatible `pagination.limit` property for frontend consumers.
 */
export const createApiClient = (defaultOptions: ApiClientOptions = {}) => {
    const {
        baseUrl: defaultBaseUrl,
        getToken: defaultGetToken,
        ...defaultRequestOptions
    } = defaultOptions;

    return async (endpoint: string, options: ApiClientOptions = {}) => {
        const { baseUrl, getToken, ...requestOptions } = options;

        const finalBaseUrl = baseUrl || defaultBaseUrl || '';
        const finalGetToken = getToken || defaultGetToken;

        const headers = new Headers(requestOptions.headers || defaultRequestOptions.headers);

        if (finalGetToken) {
            const token = await finalGetToken();
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
        }

        const mappedEndpoint = mapEndpointQueryParams(endpoint);
        const cleanedBaseUrl = finalBaseUrl.replace(/\/+$/, '');

        let response: Response;
        try {
            response = await fetch(`${cleanedBaseUrl}${mappedEndpoint}`, {
                ...defaultRequestOptions,
                ...requestOptions,
                headers,
            });
        } catch (fetchError: unknown) {
            if (fetchError instanceof ApiError) {
                throw fetchError;
            }

            const errorMsg =
                fetchError instanceof Error ? fetchError.message : String(fetchError);

            const isFailedToFetch =
                errorMsg.includes('Failed to fetch') ||
                errorMsg.includes('NetworkError') ||
                errorMsg.includes('fetch failed');

            const isAiEndpoint = endpoint.includes('/ai/');

            throw new ApiError({
                message: isFailedToFetch
                    ? (isAiEndpoint
                        ? 'Unable to connect to the AI generation service. Please check your network connection or try generating with a smaller question batch.'
                        : 'Unable to connect to the server. Please check your network connection and try again.')
                    : errorMsg || 'Network request failed',
                status: 0,
                statusText: 'Network Error',
                body: { originalError: errorMsg },
            });


        }

        if (!response.ok) {
            let message = `API Error: ${response.status} ${response.statusText}`;
            let errorBody: unknown;

            try {
                errorBody = await response.clone().json();
                const parsedErrorBody = errorBody as { error?: unknown; message?: unknown };

                if (
                    typeof parsedErrorBody.message === 'string' &&
                    parsedErrorBody.message.length > 0
                ) {
                    message = parsedErrorBody.message;
                } else if (
                    typeof parsedErrorBody.error === 'string' &&
                    parsedErrorBody.error.length > 0
                ) {
                    message = parsedErrorBody.error;
                }
            } catch {
                const textBody = await response.text();
                if (textBody) {
                    message = textBody;
                }
            }

            throw new ApiError({
                message,
                status: response.status,
                statusText: response.statusText,
                body: errorBody,
            });
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const json = await response.json();
            return mapPaginationMetadata(json);
        }

        if (contentType && contentType.includes('application/pdf')) {
            return response.blob();
        }

        return response.text();
    };
};
export type ApiClientType = ReturnType<typeof createApiClient>;
