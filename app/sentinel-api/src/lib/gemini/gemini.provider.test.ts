import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiProvider } from './gemini.provider';

describe('GeminiProvider quota retry', () => {
    const originalApiKey = process.env.GEMINI_API_KEY;

    beforeEach(() => {
        process.env.GEMINI_API_KEY = 'test-api-key';
    });

    afterEach(() => {
        vi.restoreAllMocks();

        if (originalApiKey === undefined) {
            delete process.env.GEMINI_API_KEY;
        } else {
            process.env.GEMINI_API_KEY = originalApiKey;
        }
    });

    it('retries one quota-limited structured generation request', async () => {
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(
                new Response('quota exceeded', {
                    status: 429,
                    headers: { 'Retry-After': '0' },
                }),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        candidates: [
                            {
                                content: {
                                    parts: [{ text: JSON.stringify({ ok: true }) }],
                                },
                            },
                        ],
                    }),
                    { status: 200 },
                ),
            );
        const sleepSpy = vi.spyOn(GeminiProvider as any, 'sleep').mockResolvedValue(undefined);

        await expect(
            GeminiProvider.generateStructuredJson<{ ok: boolean }>({
                prompt: 'Generate JSON.',
                responseJsonSchema: {
                    type: 'object',
                    properties: { ok: { type: 'boolean' } },
                    required: ['ok'],
                },
            }),
        ).resolves.toEqual({ ok: true });

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(sleepSpy).toHaveBeenCalledWith(0);
    });

    it('maps network failures to a safe 502 response with cause preserved', async () => {
        const originalError = new TypeError('fetch failed');
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(originalError);
        vi.spyOn(GeminiProvider as any, 'sleep').mockResolvedValue(undefined);

        const promise = GeminiProvider.generateStructuredJson<{ ok: boolean }>({
            prompt: 'Generate JSON.',
            responseJsonSchema: {
                type: 'object',
                properties: { ok: { type: 'boolean' } },
                required: ['ok'],
            },
        });

        await expect(promise).rejects.toMatchObject({
            status: 502,
            message: 'Gemini request timed out or failed to connect.',
            cause: originalError,
        });
    });

    it('retries on transient network failure and succeeds with exponential backoff', async () => {
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        candidates: [
                            {
                                content: {
                                    parts: [{ text: JSON.stringify({ ok: true }) }],
                                },
                            },
                        ],
                    }),
                    { status: 200 },
                ),
            );
        const sleepSpy = vi.spyOn(GeminiProvider as any, 'sleep').mockResolvedValue(undefined);

        const result = await GeminiProvider.generateStructuredJson<{ ok: boolean }>({
            prompt: 'Generate JSON.',
            responseJsonSchema: {
                type: 'object',
                properties: { ok: { type: 'boolean' } },
                required: ['ok'],
            },
        });

        expect(result).toEqual({ ok: true });
        expect(fetchSpy).toHaveBeenCalledTimes(3);
        expect(sleepSpy).toHaveBeenNthCalledWith(1, 1000);
        expect(sleepSpy).toHaveBeenNthCalledWith(2, 2000);
    });

    it('preserves upstream error payload as cause in createUpstreamException', async () => {
        const errorPayload = { error: { message: 'Resource exhausted or invalid argument', code: 400 } };
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify(errorPayload), { status: 400 }),
        );

        await expect(
            GeminiProvider.generateStructuredJson<{ ok: boolean }>({
                prompt: 'Generate JSON.',
                responseJsonSchema: {
                    type: 'object',
                    properties: { ok: { type: 'boolean' } },
                    required: ['ok'],
                },
            }),
        ).rejects.toMatchObject({
            status: 400,
            message: 'Resource exhausted or invalid argument',
            cause: errorPayload,
        });
    });

    it('maps aborted requests to a safe 502 response with cause preserved', async () => {
        const controller = new AbortController();
        controller.abort();

        const abortError = new DOMException('The operation was aborted.', 'AbortError');
        vi.spyOn(GeminiProvider as any, 'createTimeoutSignal').mockReturnValue(controller.signal);
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
            if (init?.signal?.aborted) {
                throw abortError;
            }

            return new Response(
                JSON.stringify({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: JSON.stringify({ ok: true }) }],
                            },
                        },
                    ],
                }),
                { status: 200 },
            );
        });

        await expect(
            GeminiProvider.generateStructuredJson<{ ok: boolean }>({
                prompt: 'Generate JSON.',
                responseJsonSchema: {
                    type: 'object',
                    properties: { ok: { type: 'boolean' } },
                    required: ['ok'],
                },
            }),
        ).rejects.toMatchObject({
            status: 502,
            message: 'Gemini request timed out or failed to connect.',
            cause: abortError,
        });
    });
});

describe('GeminiProvider timeout and model resolution', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.AI_GEMINI_TIMEOUT_MS;
        delete process.env.AI_GEMINI_TIMEOUT;
        delete process.env.GEMINI_TIMEOUT_MS;
        delete process.env.GEMINI_TIMEOUT;
        delete process.env.GEMINI_FLASH_MODEL;
        delete process.env.GEMINI_MODEL;
        delete process.env.AI_GEMINI_THINKING_BUDGET;
        delete process.env.AI_GEMINI_FALLBACK_MODEL;
        delete process.env.AI_GEMINI_PER_ATTEMPT_TIMEOUT_MS;
        delete process.env.AI_GEMINI_PER_ATTEMPT_TIMEOUT;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('defaults to 180_000 ms (180s) when no timeout env var is set', () => {
        expect(GeminiProvider.getGeminiTimeoutMs()).toBe(180_000);
    });

    it('parses AI_GEMINI_TIMEOUT_MS in milliseconds (> 1000)', () => {
        process.env.AI_GEMINI_TIMEOUT_MS = '90000';
        expect(GeminiProvider.getGeminiTimeoutMs()).toBe(90_000);
    });

    it('converts AI_GEMINI_TIMEOUT in seconds (<= 1000) to milliseconds', () => {
        process.env.AI_GEMINI_TIMEOUT = '180';
        expect(GeminiProvider.getGeminiTimeoutMs()).toBe(180_000);

        process.env.AI_GEMINI_TIMEOUT = '60';
        expect(GeminiProvider.getGeminiTimeoutMs()).toBe(60_000);
    });

    it('supports GEMINI_TIMEOUT and GEMINI_TIMEOUT_MS fallbacks', () => {
        process.env.GEMINI_TIMEOUT = '120';
        expect(GeminiProvider.getGeminiTimeoutMs()).toBe(120_000);

        delete process.env.GEMINI_TIMEOUT;
        process.env.GEMINI_TIMEOUT_MS = '150000';
        expect(GeminiProvider.getGeminiTimeoutMs()).toBe(150_000);
    });

    it('falls back safely to 180_000 ms for invalid, zero, or negative numbers', () => {
        process.env.AI_GEMINI_TIMEOUT = 'invalid';
        expect(GeminiProvider.getGeminiTimeoutMs()).toBe(180_000);

        process.env.AI_GEMINI_TIMEOUT = '0';
        expect(GeminiProvider.getGeminiTimeoutMs()).toBe(180_000);

        process.env.AI_GEMINI_TIMEOUT = '-50';
        expect(GeminiProvider.getGeminiTimeoutMs()).toBe(180_000);
    });

    it('dynamically adapts to runtime changes in process.env', () => {
        expect(GeminiProvider.getGeminiTimeoutMs()).toBe(180_000);

        process.env.AI_GEMINI_TIMEOUT = '240';
        expect(GeminiProvider.getGeminiTimeoutMs()).toBe(240_000);

        process.env.AI_GEMINI_TIMEOUT_MS = '45000';
        expect(GeminiProvider.getGeminiTimeoutMs()).toBe(45_000);
    });

    it('resolves flash models dynamically from parameters and environment variables', () => {
        expect(GeminiProvider.resolveFlashModel()).toBe('gemini-2.5-flash');

        process.env.GEMINI_MODEL = 'gemini-2.0-flash';
        expect(GeminiProvider.resolveFlashModel()).toBe('gemini-2.0-flash');

        process.env.GEMINI_FLASH_MODEL = 'gemini-1.5-flash';
        expect(GeminiProvider.resolveFlashModel()).toBe('gemini-1.5-flash');

        expect(GeminiProvider.resolveFlashModel('custom-model')).toBe('custom-model');
    });

    it('resolves thinking budget with defaults and environment overrides', () => {
        expect(GeminiProvider.resolveThinkingBudget('gemini-2.5-flash')).toBe(0);
        expect(GeminiProvider.resolveThinkingBudget('gemini-2.0-flash')).toBe(0);
        expect(GeminiProvider.resolveThinkingBudget('gemini-2.5-pro')).toBeUndefined();

        process.env.AI_GEMINI_THINKING_BUDGET = '512';
        expect(GeminiProvider.resolveThinkingBudget('gemini-2.5-pro')).toBe(512);
        expect(GeminiProvider.resolveThinkingBudget('gemini-2.5-flash')).toBe(512);

        process.env.AI_GEMINI_THINKING_BUDGET = '0';
        expect(GeminiProvider.resolveThinkingBudget('gemini-2.5-pro')).toBe(0);

        process.env.AI_GEMINI_THINKING_BUDGET = '-1';
        expect(GeminiProvider.resolveThinkingBudget('gemini-2.5-flash')).toBeUndefined();

        process.env.AI_GEMINI_THINKING_BUDGET = 'invalid';
        expect(GeminiProvider.resolveThinkingBudget('gemini-2.5-flash')).toBe(0);
    });

    it('includes thinkingConfig in generateStructuredJson payload for flash models', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';
        let capturedPayload: any;
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
            if (init?.body) {
                capturedPayload = JSON.parse(init.body as string);
            }
            return new Response(
                JSON.stringify({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: JSON.stringify({ ok: true }) }],
                            },
                        },
                    ],
                }),
                { status: 200 },
            );
        });

        await GeminiProvider.generateStructuredJson({
            prompt: 'Test prompt',
            responseJsonSchema: { type: 'object' },
            model: 'gemini-2.5-flash',
        });

        expect(capturedPayload?.generationConfig?.thinkingConfig).toEqual({
            thinkingBudget: 0,
        });
    });

    it('resolves fallback model correctly with defaults and overrides', () => {
        expect(GeminiProvider.resolveFallbackModel('gemini-2.5-flash')).toBe('gemini-2.5-flash-lite');
        expect(GeminiProvider.resolveFallbackModel('gemini-2.5-flash-lite')).toBe('gemini-2.5-flash-lite');

        process.env.AI_GEMINI_FALLBACK_MODEL = 'gemini-3.6-flash';
        expect(GeminiProvider.resolveFallbackModel('gemini-2.5-flash')).toBe('gemini-3.6-flash');
    });

    it('resolves per-attempt generation timeout with defaults and overrides', () => {
        expect(GeminiProvider.getPerAttemptGenerationTimeoutMs()).toBe(28_000);

        process.env.AI_GEMINI_PER_ATTEMPT_TIMEOUT_MS = '25000';
        expect(GeminiProvider.getPerAttemptGenerationTimeoutMs()).toBe(25_000);

        delete process.env.AI_GEMINI_PER_ATTEMPT_TIMEOUT_MS;
        process.env.AI_GEMINI_PER_ATTEMPT_TIMEOUT = '30';
        expect(GeminiProvider.getPerAttemptGenerationTimeoutMs()).toBe(30_000);
    });

    it('retries on upstream 504 DEADLINE_EXCEEDED and switches to fallback model', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';
        const urlsCalled: string[] = [];

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            urlsCalled.push(String(input));
            if (urlsCalled.length === 1) {
                return new Response(
                    JSON.stringify({
                        error: {
                            code: 504,
                            message: 'The request timed out. Please try again.',
                            status: 'DEADLINE_EXCEEDED',
                        },
                    }),
                    { status: 504 },
                );
            }
            return new Response(
                JSON.stringify({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: JSON.stringify({ ok: true }) }],
                            },
                        },
                    ],
                }),
                { status: 200 },
            );
        });
        const sleepSpy = vi.spyOn(GeminiProvider as any, 'sleep').mockResolvedValue(undefined);

        const result = await GeminiProvider.generateStructuredJson<{ ok: boolean }>({
            prompt: 'Test prompt',
            responseJsonSchema: { type: 'object' },
            model: 'gemini-2.5-flash',
        });

        expect(result).toEqual({ ok: true });
        expect(urlsCalled.length).toBe(2);
        expect(urlsCalled[0]).toContain('gemini-2.5-flash');
        expect(urlsCalled[1]).toContain('gemini-2.5-flash-lite');
        expect(sleepSpy).toHaveBeenCalledWith(1500);
    });

    it('retries on upstream 503 UNAVAILABLE and succeeds', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';
        const urlsCalled: string[] = [];

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            urlsCalled.push(String(input));
            if (urlsCalled.length === 1) {
                return new Response(
                    JSON.stringify({
                        error: {
                            code: 503,
                            message: 'The model is overloaded. Please try again later.',
                            status: 'UNAVAILABLE',
                        },
                    }),
                    { status: 503 },
                );
            }
            return new Response(
                JSON.stringify({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: JSON.stringify({ ok: true }) }],
                            },
                        },
                    ],
                }),
                { status: 200 },
            );
        });
        vi.spyOn(GeminiProvider as any, 'sleep').mockResolvedValue(undefined);

        const result = await GeminiProvider.generateStructuredJson<{ ok: boolean }>({
            prompt: 'Test prompt',
            responseJsonSchema: { type: 'object' },
            model: 'gemini-2.5-flash',
        });

        expect(result).toEqual({ ok: true });
        expect(urlsCalled.length).toBe(2);
    });

    it('retries on timeout abort and switches to fallback model', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';
        const urlsCalled: string[] = [];
        const abortError = new DOMException('The operation was aborted.', 'AbortError');

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            urlsCalled.push(String(input));
            if (urlsCalled.length === 1) {
                throw abortError;
            }
            return new Response(
                JSON.stringify({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: JSON.stringify({ ok: true }) }],
                            },
                        },
                    ],
                }),
                { status: 200 },
            );
        });
        vi.spyOn(GeminiProvider as any, 'sleep').mockResolvedValue(undefined);

        const result = await GeminiProvider.generateStructuredJson<{ ok: boolean }>({
            prompt: 'Test prompt',
            responseJsonSchema: { type: 'object' },
            model: 'gemini-2.5-flash',
        });

        expect(result).toEqual({ ok: true });
        expect(urlsCalled.length).toBe(2);
        expect(urlsCalled[0]).toContain('gemini-2.5-flash');
        expect(urlsCalled[1]).toContain('gemini-2.5-flash-lite');
    });
});



