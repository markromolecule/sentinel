import { HTTPException } from 'hono/http-exception';
import { aiRequestThrottler } from './middleware/gemini-request-throttler';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com';
const DEFAULT_FLASH_MODEL = 'gemini-2.5-flash';
const MAX_QUOTA_RETRIES = 1;
const DEFAULT_QUOTA_RETRY_DELAY_MS = 2_000;
const MAX_QUOTA_RETRY_DELAY_MS = 3_000;
const MAX_NETWORK_RETRIES = 1;
const NETWORK_RETRY_DELAY_MS = 1_500;
export const DEFAULT_GEMINI_GENERATION_TIMEOUT_MS = 180_000;

const GEMINI_REQUEST_FAILURE_MESSAGE = 'Gemini request timed out or failed to connect.';

type GeminiJsonSchema = Record<string, unknown>;
type UpstreamHttpStatus = 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 502;

export type UploadedGeminiFile = {
    name: string;
    uri: string;
    mimeType: string;
    sizeBytes?: string;
    displayName?: string;
};

export class GeminiProvider {
    static resolveFlashModel(model?: string) {
        return (
            model?.trim() ||
            process.env.GEMINI_FLASH_MODEL?.trim() ||
            process.env.GEMINI_MODEL?.trim() ||
            DEFAULT_FLASH_MODEL
        );
    }

    static resolveThinkingBudget(model: string): number | undefined {
        const rawBudget = process.env.AI_GEMINI_THINKING_BUDGET?.trim();
        if (rawBudget !== undefined && rawBudget !== '') {
            const parsed = Number(rawBudget);
            if (Number.isFinite(parsed)) {
                return parsed >= 0 ? Math.round(parsed) : undefined;
            }
        }

        if (model.toLowerCase().includes('flash')) {
            return 0;
        }

        return undefined;
    }

    static getGeminiTimeoutMs(): number {
        const candidateKeys = [
            'AI_GEMINI_TIMEOUT_MS',
            'AI_GEMINI_TIMEOUT',
            'GEMINI_TIMEOUT_MS',
            'GEMINI_TIMEOUT',
        ];

        for (const key of candidateKeys) {
            const rawValue = process.env[key]?.trim();
            if (!rawValue) continue;

            const parsed = Number(rawValue);
            if (Number.isFinite(parsed) && parsed > 0) {
                // If <= 1000, interpret as seconds (e.g. 180 -> 180,000 ms)
                return parsed <= 1000 ? Math.round(parsed * 1000) : Math.round(parsed);
            }
        }

        return DEFAULT_GEMINI_GENERATION_TIMEOUT_MS;
    }

    static async uploadFile(args: {
        buffer: Buffer;
        mimeType: string;
        displayName: string;
    }): Promise<UploadedGeminiFile> {
        const apiKey = this.getApiKey();
        const startResponse = await this.fetchWithThrottle(
            `${GEMINI_API_BASE_URL}/upload/v1beta/files`,
            {
                method: 'POST',
                headers: {
                    'x-goog-api-key': apiKey,
                    'X-Goog-Upload-Protocol': 'resumable',
                    'X-Goog-Upload-Command': 'start',
                    'X-Goog-Upload-Header-Content-Length': String(args.buffer.byteLength),
                    'X-Goog-Upload-Header-Content-Type': args.mimeType,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    file: {
                        display_name: args.displayName,
                    },
                }),
            },
        );

        if (!startResponse.ok) {
            throw await this.createUpstreamException(
                startResponse,
                'Failed to initialize Gemini file upload.',
            );
        }

        const uploadUrl = startResponse.headers.get('x-goog-upload-url');

        if (!uploadUrl) {
            throw new HTTPException(502, {
                message: 'Gemini file upload did not return a resumable upload URL.',
                cause: new Error('Missing x-goog-upload-url header'),
            });
        }

        const uploadResponse = await this.fetchWithThrottle(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Length': String(args.buffer.byteLength),
                'Content-Type': args.mimeType,
                'X-Goog-Upload-Offset': '0',
                'X-Goog-Upload-Command': 'upload, finalize',
            },
            body: new Uint8Array(args.buffer),
        });

        if (!uploadResponse.ok) {
            throw await this.createUpstreamException(
                uploadResponse,
                'Failed to upload the PDF to Gemini.',
            );
        }

        const uploadPayload = await uploadResponse.json();
        const file = uploadPayload.file ?? uploadPayload;

        if (!file?.name || !file?.uri) {
            throw new HTTPException(502, {
                message: 'Gemini upload completed without returning file metadata.',
                cause: new Error('Missing file.name or file.uri in upload response payload'),
            });
        }

        return {
            name: file.name,
            uri: file.uri,
            mimeType: file.mimeType ?? args.mimeType,
            sizeBytes: file.sizeBytes,
            displayName: file.displayName ?? file.display_name,
        };
    }

    static async generateStructuredJson<T>(args: {
        prompt: string;
        responseJsonSchema: GeminiJsonSchema;
        files?: Array<Pick<UploadedGeminiFile, 'uri' | 'mimeType'>>;
        model?: string;
    }): Promise<T> {
        const apiKey = this.getApiKey();
        const model = this.resolveFlashModel(args.model);
        const thinkingBudget = this.resolveThinkingBudget(model);
        const requestInit: RequestInit = {
            method: 'POST',
            headers: {
                'x-goog-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            ...(args.files?.length
                                ? args.files.map((file) => ({
                                    file_data: {
                                        mime_type: file.mimeType,
                                        file_uri: file.uri,
                                    },
                                }))
                                : []),
                            {
                                text: args.prompt,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseJsonSchema: args.responseJsonSchema,
                    ...(thinkingBudget !== undefined
                        ? {
                            thinkingConfig: {
                                thinkingBudget,
                            },
                        }
                        : {}),
                },
            }),
        };

        let response: Response | undefined;
        for (let attempt = 0; attempt <= MAX_QUOTA_RETRIES; attempt++) {
            response = await this.fetchWithThrottle(
                `${GEMINI_API_BASE_URL}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
                requestInit,
            );

            if (response.status !== 429 || attempt === MAX_QUOTA_RETRIES) {
                break;
            }

            const retryDelayMs = await this.resolveQuotaRetryDelayMs(response);
            console.warn(
                `Gemini quota limit reached. Retrying generation in ${Math.ceil(retryDelayMs / 1000)} seconds.`,
            );
            await this.sleep(retryDelayMs);
        }

        if (!response) {
            throw new HTTPException(502, {
                message: 'Gemini did not return a response.',
                cause: new Error('Response is undefined after quota retries'),
            });
        }

        if (!response.ok) {
            throw await this.createUpstreamException(
                response,
                'Gemini failed while generating structured questions.',
            );
        }

        const payload = await response.json();
        const text = this.extractResponseText(payload);

        if (!text) {
            const blockReason = payload?.promptFeedback?.blockReason;
            throw new HTTPException(502, {
                message: blockReason
                    ? `Gemini blocked the request: ${blockReason}.`
                    : 'Gemini returned an empty response.',
                cause: payload ?? new Error('Empty text part in Gemini response'),
            });
        }

        try {
            return JSON.parse(text) as T;
        } catch (error) {
            console.error('Failed to parse Gemini JSON response:', error, text);
            throw new HTTPException(502, {
                message: 'Gemini returned invalid JSON.',
                cause: error,
            });
        }
    }

    static async deleteFile(name: string) {
        const apiKey = this.getApiKey();
        const response = await this.fetchWithThrottle(
            `${GEMINI_API_BASE_URL}/v1beta/${encodeURIComponent(name).replace(/%2F/g, '/')}`,
            {
                method: 'DELETE',
                headers: {
                    'x-goog-api-key': apiKey,
                },
            },
        );

        if (response.status === 404) {
            return;
        }

        if (!response.ok) {
            throw await this.createUpstreamException(
                response,
                'Gemini generated the preview but failed to delete the uploaded file.',
            );
        }
    }

    private static getApiKey() {
        const apiKey = process.env.GEMINI_API_KEY?.trim();

        if (!apiKey) {
            throw new HTTPException(500, {
                message: 'Missing GEMINI_API_KEY in the environment.',
            });
        }

        return apiKey;
    }

    private static extractResponseText(payload: any) {
        const parts = payload?.candidates?.flatMap(
            (candidate: any) => candidate?.content?.parts ?? [],
        );
        const textPart = parts?.find((part: any) => typeof part?.text === 'string');
        return textPart?.text as string | undefined;
    }

    private static async createUpstreamException(response: Response, fallbackMessage: string) {
        const responseText = await response.text();
        let message = fallbackMessage;
        let errorDetails: unknown = undefined;

        if (responseText) {
            try {
                const payload = JSON.parse(responseText);
                message = payload?.error?.message || payload?.message || fallbackMessage;
                errorDetails = payload;
            } catch {
                message = responseText;
                errorDetails = responseText;
            }
        }

        const status = this.mapUpstreamStatus(response.status);
        console.error(
            `[GeminiProvider] Upstream API error (${response.status} -> HTTP ${status}): ${message}`,
            errorDetails,
        );

        throw new HTTPException(status, {
            message,
            cause: errorDetails ?? new Error(message),
        });
    }

    private static mapUpstreamStatus(status: number): UpstreamHttpStatus {
        switch (status) {
            case 400:
            case 401:
            case 403:
            case 404:
            case 409:
            case 413:
            case 415:
            case 422:
            case 429:
                return status;
            default:
                return 502;
        }
    }

    private static createTimeoutSignal(timeoutMs: number) {
        const abortSignal = globalThis.AbortSignal;

        if (typeof abortSignal?.timeout === 'function') {
            return abortSignal.timeout(timeoutMs);
        }

        const AbortControllerCtor = globalThis.AbortController;

        if (typeof AbortControllerCtor !== 'function') {
            return undefined;
        }

        const controller = new AbortControllerCtor();
        setTimeout(() => controller.abort(), timeoutMs);
        return controller.signal;
    }

    private static isTransientNetworkError(error: unknown, signal?: AbortSignal): boolean {
        if (signal?.aborted) {
            return false;
        }

        if (error instanceof TypeError) {
            return true;
        }

        if (typeof error === 'object' && error !== null) {
            const err = error as Record<string, unknown>;
            const cause = err.cause as Record<string, unknown> | undefined;
            const code = String(err.code || cause?.code || '');
            if (
                [
                    'ECONNRESET',
                    'ECONNREFUSED',
                    'EPIPE',
                    'ETIMEDOUT',
                    'UND_ERR_SOCKET',
                    'UND_ERR_CONNECT_TIMEOUT',
                    'UND_ERR_HEADERS_TIMEOUT',
                ].includes(code)
            ) {
                return true;
            }
        }

        return false;
    }

    private static isTimeoutOrNetworkFailure(error: unknown) {
        if (!error) return false;

        if (
            error instanceof DOMException &&
            (error.name === 'AbortError' || error.name === 'TimeoutError')
        ) {
            return true;
        }

        if (error instanceof TypeError) {
            return true;
        }

        return (
            typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            ((error as { name?: unknown }).name === 'AbortError' ||
                (error as { name?: unknown }).name === 'TimeoutError')
        );
    }

    private static async resolveQuotaRetryDelayMs(response: Response) {
        const retryAfter = response.headers.get('retry-after');

        if (retryAfter) {
            const seconds = Number(retryAfter);
            if (Number.isFinite(seconds) && seconds >= 0) {
                return Math.min(MAX_QUOTA_RETRY_DELAY_MS, Math.ceil(seconds * 1000));
            }

            const retryAt = Date.parse(retryAfter);
            if (Number.isFinite(retryAt)) {
                return Math.min(MAX_QUOTA_RETRY_DELAY_MS, Math.max(0, retryAt - Date.now()));
            }
        }

        const responseText = await response.clone().text();
        const retryDelayMatch =
            responseText.match(/"retryDelay"\s*:\s*"([\d.]+)s"/i) ??
            responseText.match(/retry in ([\d.]+)s/i);
        const retryDelaySeconds = Number(retryDelayMatch?.[1]);

        if (Number.isFinite(retryDelaySeconds) && retryDelaySeconds >= 0) {
            return Math.min(MAX_QUOTA_RETRY_DELAY_MS, Math.ceil(retryDelaySeconds * 1000));
        }

        return DEFAULT_QUOTA_RETRY_DELAY_MS;
    }

    private static sleep(ms: number) {
        return new Promise<void>((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    private static async fetchWithThrottle(input: string, init: RequestInit) {
        return await aiRequestThrottler.schedule(async () => {
            const timeoutMs = this.getGeminiTimeoutMs();
            const startTime = Date.now();

            for (let attempt = 0; attempt <= MAX_NETWORK_RETRIES; attempt++) {
                const signal = this.createTimeoutSignal(timeoutMs);

                try {
                    return await fetch(input, {
                        ...init,
                        ...(signal ? { signal } : {}),
                    });
                } catch (error) {
                    const elapsedMs = Date.now() - startTime;
                    const isTransient = this.isTransientNetworkError(error, signal);

                    if (isTransient && attempt < MAX_NETWORK_RETRIES) {
                        console.warn(
                            `[GeminiProvider] Transient network failure during fetch to ${input} (attempt ${attempt + 1}/${MAX_NETWORK_RETRIES + 1}, elapsed ${elapsedMs}ms). Retrying in ${NETWORK_RETRY_DELAY_MS}ms... Error: ${error instanceof Error ? error.message : String(error)}`,
                        );
                        await this.sleep(NETWORK_RETRY_DELAY_MS);
                        continue;
                    }

                    console.error(
                        `[GeminiProvider] Upstream request failed for ${input} after ${elapsedMs}ms (attempt ${attempt + 1}/${MAX_NETWORK_RETRIES + 1}). Error:`,
                        error,
                    );

                    if (this.isTimeoutOrNetworkFailure(error)) {
                        throw new HTTPException(502, {
                            message: GEMINI_REQUEST_FAILURE_MESSAGE,
                            cause: error,
                        });
                    }

                    throw error;
                }
            }

            throw new HTTPException(502, {
                message: GEMINI_REQUEST_FAILURE_MESSAGE,
            });
        });
    }
}
