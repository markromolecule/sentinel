import { describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_DEV_PORT,
    DEFAULT_PROD_PORT,
    isProduction,
    normalizeUrl,
    resolveBaseUrl,
    resolveBindHost,
    resolveServerPort,
    validateProductionInviteUrls,
} from './server.config';

describe('server.config', () => {
    describe('isProduction', () => {
        it('returns true when NODE_ENV is production', () => {
            expect(isProduction({ NODE_ENV: 'production' })).toBe(true);
        });

        it('returns false for non-production environments', () => {
            expect(isProduction({ NODE_ENV: 'development' })).toBe(false);
            expect(isProduction({ NODE_ENV: 'test' })).toBe(false);
            expect(isProduction({})).toBe(false);
        });
    });

    describe('resolveServerPort', () => {
        it('defaults to 8080 in production when PORT is omitted', () => {
            const port = resolveServerPort({ NODE_ENV: 'production' });
            expect(port).toBe(DEFAULT_PROD_PORT);
            expect(port).toBe(8080);
        });

        it('uses explicit PORT in production when provided', () => {
            const port = resolveServerPort({ NODE_ENV: 'production', PORT: '8080' });
            expect(port).toBe(8080);

            const customPort = resolveServerPort({ NODE_ENV: 'production', PORT: '9000' });
            expect(customPort).toBe(9000);
        });

        it('defaults to 3001 in development when PORT is omitted', () => {
            const port = resolveServerPort({ NODE_ENV: 'development' });
            expect(port).toBe(DEFAULT_DEV_PORT);
            expect(port).toBe(3001);

            const emptyEnvPort = resolveServerPort({});
            expect(emptyEnvPort).toBe(3001);
        });

        it('uses explicit PORT in development when provided', () => {
            const port = resolveServerPort({ NODE_ENV: 'development', PORT: '4000' });
            expect(port).toBe(4000);
        });

        it('trims whitespace around PORT string', () => {
            const port = resolveServerPort({ NODE_ENV: 'development', PORT: '  5000  ' });
            expect(port).toBe(5000);
        });

        it('falls back to environment default when PORT is non-numeric or invalid', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            expect(resolveServerPort({ NODE_ENV: 'production', PORT: 'invalid' })).toBe(8080);
            expect(resolveServerPort({ NODE_ENV: 'development', PORT: 'invalid' })).toBe(3001);
            expect(resolveServerPort({ NODE_ENV: 'production', PORT: '-5' })).toBe(8080);
            expect(resolveServerPort({ NODE_ENV: 'production', PORT: '70000' })).toBe(8080);

            consoleSpy.mockRestore();
        });
    });

    describe('resolveBindHost', () => {
        it('defaults to 0.0.0.0 when neither BIND_HOST nor HOST are set', () => {
            expect(resolveBindHost({})).toBe('0.0.0.0');
        });

        it('returns valid IPv4 address', () => {
            expect(resolveBindHost({ HOST: '127.0.0.1' })).toBe('127.0.0.1');
        });

        it('returns localhost', () => {
            expect(resolveBindHost({ HOST: 'localhost' })).toBe('localhost');
        });

        it('prioritizes BIND_HOST over HOST', () => {
            expect(resolveBindHost({ BIND_HOST: '127.0.0.1', HOST: '0.0.0.0' })).toBe('127.0.0.1');
        });

        it('warns and falls back to 0.0.0.0 for invalid host format', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            expect(resolveBindHost({ HOST: 'invalid host domain' })).toBe('0.0.0.0');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('resolveBaseUrl', () => {
        it('returns production domain in production', () => {
            expect(resolveBaseUrl(8080, { NODE_ENV: 'production' })).toBe('https://api.sentinelph.tech');
        });

        it('returns localhost with port in development', () => {
            expect(resolveBaseUrl(3001, { NODE_ENV: 'development' })).toBe('http://localhost:3001');
            expect(resolveBaseUrl(8080, { NODE_ENV: 'development' })).toBe('http://localhost:8080');
        });
    });

    describe('normalizeUrl', () => {
        it('strips trailing slashes from valid URLs', () => {
            expect(normalizeUrl('https://app.sentinelph.tech/')).toBe('https://app.sentinelph.tech');
            expect(normalizeUrl('https://app.sentinelph.tech///')).toBe('https://app.sentinelph.tech');
        });

        it('returns null for null, undefined, or invalid URLs', () => {
            expect(normalizeUrl(null)).toBeNull();
            expect(normalizeUrl(undefined)).toBeNull();
            expect(normalizeUrl('not-a-url')).toBeNull();
        });
    });

    describe('validateProductionInviteUrls', () => {
        it('does nothing in non-production environments', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            validateProductionInviteUrls({
                NODE_ENV: 'development',
                NEXT_PUBLIC_APP_URL: 'invalid-url',
            });
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('warns when a production URL is malformed or mismatched', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            validateProductionInviteUrls({
                NODE_ENV: 'production',
                NEXT_PUBLIC_APP_URL: 'http://mismatched.domain.com',
            });
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('NEXT_PUBLIC_APP_URL is set to http://mismatched.domain.com'),
            );
            consoleSpy.mockRestore();
        });
    });
});
