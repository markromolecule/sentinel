import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
    Platform: {
        OS: 'ios',
    },
}));

vi.mock('expo-constants', () => ({
    default: {
        expoConfig: null,
    },
}));

import {
    PRODUCTION_API_URL,
    resolveApiBaseUrl,
} from './api-config';

describe('resolveApiBaseUrl', () => {
    it('returns production API URL in production mode by default', () => {
        const url = resolveApiBaseUrl({
            isDev: false,
            envUrl: '',
        });
        expect(url).toBe(PRODUCTION_API_URL);
    });

    it('ignores localhost envUrl in production mode and falls back to production API', () => {
        const url = resolveApiBaseUrl({
            isDev: false,
            envUrl: 'http://localhost:3001',
        });
        expect(url).toBe(PRODUCTION_API_URL);
    });

    it('honors explicit custom production URL in production mode', () => {
        const url = resolveApiBaseUrl({
            isDev: false,
            envUrl: 'https://staging-api.sentinelph.tech/',
        });
        expect(url).toBe('https://staging-api.sentinelph.tech');
    });

    it('honors explicit LAN IP in development mode', () => {
        const url = resolveApiBaseUrl({
            isDev: true,
            envUrl: 'http://192.168.1.102:3001',
        });
        expect(url).toBe('http://192.168.1.102:3001');
    });

    it('extracts host IP from Expo hostUri when envUrl is localhost or unset in dev mode', () => {
        const url = resolveApiBaseUrl({
            isDev: true,
            envUrl: '',
            hostUri: '192.168.1.102:8081',
        });
        expect(url).toBe('http://192.168.1.102:3001');
    });

    it('falls back to 10.0.2.2 for Android emulator when hostUri is not available and envUrl is empty', () => {
        const url = resolveApiBaseUrl({
            isDev: true,
            envUrl: '',
            hostUri: null,
            platformOs: 'android',
        });
        expect(url).toBe('http://10.0.2.2:3001');
    });

    it('falls back to localhost:3001 for iOS simulator when hostUri is not available and envUrl is empty', () => {
        const url = resolveApiBaseUrl({
            isDev: true,
            envUrl: '',
            hostUri: null,
            platformOs: 'ios',
        });
        expect(url).toBe('http://localhost:3001');
    });

    it('strips trailing slashes correctly', () => {
        const url = resolveApiBaseUrl({
            isDev: true,
            envUrl: 'http://192.168.1.102:3001///',
        });
        expect(url).toBe('http://192.168.1.102:3001');
    });
});
