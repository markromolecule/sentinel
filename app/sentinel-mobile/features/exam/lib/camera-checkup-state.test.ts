import { describe, it, expect } from 'vitest';
import { getCameraStatusText, shouldMountCameraView } from './camera-checkup-state';

describe('camera checkup state', () => {
    it('returns Optional when camera is not required', () => {
        const result = getCameraStatusText({
            requiresCamera: false,
            hasPermission: false,
            cameraReady: false,
        });
        expect(result).toBe('Optional');
    });

    it('returns Permission Required when camera is required but permission is false', () => {
        const result = getCameraStatusText({
            requiresCamera: true,
            hasPermission: false,
            cameraReady: false,
        });
        expect(result).toBe('Permission Required');
    });

    it('returns Initializing when camera is required, permitted, but not yet ready', () => {
        const result = getCameraStatusText({
            requiresCamera: true,
            hasPermission: true,
            cameraReady: false,
        });
        expect(result).toBe('Initializing');
    });

    it('returns Ready when camera is required, permitted, and ready', () => {
        const result = getCameraStatusText({
            requiresCamera: true,
            hasPermission: true,
            cameraReady: true,
        });
        expect(result).toBe('Ready');
    });

    it('determines shouldMountCameraView correctly', () => {
        expect(shouldMountCameraView({ requiresCamera: true, hasPermission: true })).toBe(true);
        expect(shouldMountCameraView({ requiresCamera: true, hasPermission: false })).toBe(false);
        expect(shouldMountCameraView({ requiresCamera: false, hasPermission: true })).toBe(false);
    });
});
