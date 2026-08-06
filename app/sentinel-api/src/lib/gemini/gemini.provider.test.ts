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
