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

    it('maps network failures to a safe 502 response', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

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
        });
    });

    it('maps aborted requests to a safe 502 response', async () => {
        const controller = new AbortController();
        controller.abort();

        vi.spyOn(GeminiProvider as any, 'createTimeoutSignal').mockReturnValue(controller.signal);
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
            if (init?.signal?.aborted) {
                throw new DOMException('The operation was aborted.', 'AbortError');
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
});

