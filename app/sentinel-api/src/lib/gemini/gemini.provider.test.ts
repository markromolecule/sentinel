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
});
