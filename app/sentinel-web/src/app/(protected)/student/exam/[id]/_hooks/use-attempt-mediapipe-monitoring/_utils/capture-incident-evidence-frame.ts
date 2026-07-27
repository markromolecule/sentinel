export const DEFAULT_EVIDENCE_MAX_DIMENSION = 1280;
export const DEFAULT_EVIDENCE_MAX_BYTES = 524288;

export type CaptureIncidentEvidenceFrameOptions = {
    maxDimension?: number;
    maxBytes?: number;
    preferredMimeTypes?: readonly ('image/webp' | 'image/jpeg')[];
    quality?: number;
};

export type CapturedIncidentEvidenceFrame = {
    blob: Blob;
    mimeType: 'image/webp' | 'image/jpeg';
    width: number;
    height: number;
};

function toBlob(
    canvas: HTMLCanvasElement,
    mimeType: 'image/webp' | 'image/jpeg',
    quality: number,
) {
    return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });
}

function resolveScaledDimensions(videoWidth: number, videoHeight: number, maxDimension: number) {
    const longestSide = Math.max(videoWidth, videoHeight);
    const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;

    return {
        width: Math.max(1, Math.round(videoWidth * scale)),
        height: Math.max(1, Math.round(videoHeight * scale)),
    };
}

/**
 * Captures the current MediaPipe video frame into an in-memory canvas and
 * encodes it as a bounded browser blob for evidence upload.
 */
export async function captureIncidentEvidenceFrame(
    video: HTMLVideoElement,
    options: CaptureIncidentEvidenceFrameOptions = {},
): Promise<CapturedIncidentEvidenceFrame> {
    const {
        maxDimension = DEFAULT_EVIDENCE_MAX_DIMENSION,
        maxBytes = DEFAULT_EVIDENCE_MAX_BYTES,
        preferredMimeTypes = ['image/webp', 'image/jpeg'],
        quality = 0.82,
    } = options;

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        throw new Error('Evidence capture skipped because the current video frame is unavailable.');
    }

    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        throw new Error('Evidence capture skipped because the video dimensions are invalid.');
    }

    const { width, height } = resolveScaledDimensions(
        video.videoWidth,
        video.videoHeight,
        maxDimension,
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
        canvas.width = 0;
        canvas.height = 0;
        throw new Error('Evidence capture skipped because the canvas context is unavailable.');
    }

    try {
        context.drawImage(video, 0, 0, width, height);

        for (const mimeType of preferredMimeTypes) {
            const blob = await toBlob(canvas, mimeType, quality);

            if (!blob || blob.size <= 0) {
                continue;
            }

            if (blob.size > maxBytes) {
                throw new Error(
                    `Evidence capture skipped because the encoded frame exceeded ${maxBytes} bytes.`,
                );
            }

            return {
                blob,
                mimeType,
                width,
                height,
            };
        }

        throw new Error('Evidence capture skipped because the frame could not be encoded.');
    } finally {
        context.clearRect(0, 0, width, height);
        canvas.width = 0;
        canvas.height = 0;
    }
}
