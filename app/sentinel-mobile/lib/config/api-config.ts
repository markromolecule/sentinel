import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const PRODUCTION_API_URL = 'https://api.sentinelph.tech';
export const DEFAULT_DEV_PORT = '3001';

export interface ResolveApiBaseUrlOptions {
    envUrl?: string;
    hostUri?: string | null;
    isDev?: boolean;
    platformOs?: string;
}

/**
 * Resolves the appropriate Sentinel API base URL based on environment,
 * Expo packager host detection, and platform defaults.
 */
export function resolveApiBaseUrl(options: ResolveApiBaseUrlOptions = {}): string {
    const isDev = options.isDev !== undefined ? options.isDev : __DEV__;
    const platformOs = options.platformOs ?? Platform.OS;
    const envUrl = (
        options.envUrl !== undefined
            ? options.envUrl
            : process.env.EXPO_PUBLIC_API_URL || ''
    ).trim();

    // 1. Production Mode: Always default to production API unless explicitly configured
    if (!isDev) {
        if (envUrl && !isLocalhostOrLoopback(envUrl)) {
            return sanitizeBaseUrl(envUrl);
        }
        return PRODUCTION_API_URL;
    }

    // 2. Development Mode: Check if an explicit valid LAN or custom URL was set in .env
    if (envUrl && !isLocalhostOrLoopback(envUrl)) {
        return sanitizeBaseUrl(envUrl);
    }

    // 3. Extract packager host from Expo Constants (e.g. "192.168.1.102:8081" -> "192.168.1.102")
    const hostUri =
        options.hostUri !== undefined
            ? options.hostUri
            : Constants.expoConfig?.hostUri ||
            (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
            null;

    if (hostUri) {
        const hostIp = hostUri.split(':')[0];
        if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
            return `http://${hostIp}:${DEFAULT_DEV_PORT}`;
        }
    }

    // 4. Android Emulator loopback fallback
    if (platformOs === 'android') {
        return `http://10.0.2.2:${DEFAULT_DEV_PORT}`;
    }

    // 5. Explicit or fallback localhost
    if (envUrl) {
        return sanitizeBaseUrl(envUrl);
    }

    return `http://localhost:${DEFAULT_DEV_PORT}`;
}

function isLocalhostOrLoopback(url: string): boolean {
    return (
        url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        url.includes('0.0.0.0')
    );
}

function sanitizeBaseUrl(url: string): string {
    return url.trim().replace(/\/+$/, '');
}

/**
 * Returns the resolved API base URL.
 */
export function getApiBaseUrl(): string {
    return resolveApiBaseUrl();
}

/**
 * Logs the active API network configuration in development.
 */
export function logApiConfiguration(): void {
    if (!__DEV__) return;

    const resolvedUrl = resolveApiBaseUrl();
    const hostUri = Constants.expoConfig?.hostUri;

    console.log('[Sentinel Mobile Network]', {
        resolvedApiUrl: resolvedUrl,
        expoHostUri: hostUri || '(none)',
        platform: Platform.OS,
        envApiUrl: process.env.EXPO_PUBLIC_API_URL || '(unset)',
    });
}
