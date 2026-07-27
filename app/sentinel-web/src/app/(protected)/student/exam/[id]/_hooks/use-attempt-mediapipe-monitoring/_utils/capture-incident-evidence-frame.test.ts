import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    captureIncidentEvidenceFrame,
    DEFAULT_EVIDENCE_MAX_BYTES,
} from './capture-incident-evidence-frame';

function createVideoElement() {
    const video = document.createElement('video');

    Object.defineProperty(video, 'readyState', {
        value: HTMLMediaElement.HAVE_CURRENT_DATA,
        configurable: true,
    });
    Object.defineProperty(video, 'videoWidth', {
        value: 1920,
        configurable: true,
    });
    Object.defineProperty(video, 'videoHeight', {
        value: 1080,
        configurable: true,
    });

    return video;
}

describe('captureIncidentEvidenceFrame', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('scales the captured frame to the requested maximum dimension while preserving aspect ratio', async () => {
        const video = createVideoElement();
        const drawImage = vi.fn();
        const clearRect = vi.fn();
        const toBlob = vi.fn((callback: BlobCallback) =>
            callback(new Blob(['frame'], { type: 'image/webp' })),
        );
        const originalCreateElement = document.createElement.bind(document);

        vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
            if (tagName !== 'canvas') {
                return originalCreateElement(tagName);
            }

            return {
                width: 0,
                height: 0,
                getContext: () => ({
                    drawImage,
                    clearRect,
                }),
                toBlob,
            } as unknown as HTMLCanvasElement;
        }) as typeof document.createElement);

        const result = await captureIncidentEvidenceFrame(video, {
            maxDimension: 1280,
        });

        expect(result.width).toBe(1280);
        expect(result.height).toBe(720);
        expect(result.mimeType).toBe('image/webp');
        expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720);
        expect(clearRect).toHaveBeenCalledWith(0, 0, 1280, 720);
    });

    it('falls back to JPEG when WebP encoding returns null', async () => {
        const video = createVideoElement();
        const toBlob = vi
            .fn()
            .mockImplementationOnce((callback) => callback(null))
            .mockImplementationOnce((callback) =>
                callback(new Blob(['jpeg'], { type: 'image/jpeg' })),
            );
        const originalCreateElement = document.createElement.bind(document);

        vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
            if (tagName !== 'canvas') {
                return originalCreateElement(tagName);
            }

            return {
                width: 0,
                height: 0,
                getContext: () => ({
                    drawImage: vi.fn(),
                    clearRect: vi.fn(),
                }),
                toBlob,
            } as unknown as HTMLCanvasElement;
        }) as typeof document.createElement);

        const result = await captureIncidentEvidenceFrame(video);

        expect(result.mimeType).toBe('image/jpeg');
        expect(toBlob).toHaveBeenCalledTimes(2);
    });

    it('rejects oversized blobs', async () => {
        const video = createVideoElement();
        const oversizedBlob = new Blob(['x'.repeat(DEFAULT_EVIDENCE_MAX_BYTES + 1)], {
            type: 'image/webp',
        });
        const originalCreateElement = document.createElement.bind(document);

        vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
            if (tagName !== 'canvas') {
                return originalCreateElement(tagName);
            }

            return {
                width: 0,
                height: 0,
                getContext: () => ({
                    drawImage: vi.fn(),
                    clearRect: vi.fn(),
                }),
                toBlob: (callback: BlobCallback) => callback(oversizedBlob),
            } as unknown as HTMLCanvasElement;
        }) as typeof document.createElement);

        await expect(captureIncidentEvidenceFrame(video)).rejects.toThrow(
            /exceeded 524288 bytes/i,
        );
    });
});
