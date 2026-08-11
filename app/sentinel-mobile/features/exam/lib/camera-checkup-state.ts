/**
 * Helper utilities for managing camera state and status text in exam checkup.
 */

export type CameraStatusParams = {
    requiresCamera: boolean;
    hasPermission: boolean;
    cameraReady: boolean;
};

/**
 * Derives the human-readable camera status string for system checkup status rows.
 */
export function getCameraStatusText({
    requiresCamera,
    hasPermission,
    cameraReady,
}: CameraStatusParams): 'Optional' | 'Permission Required' | 'Ready' | 'Initializing' {
    if (!requiresCamera) return 'Optional';
    if (!hasPermission) return 'Permission Required';
    if (cameraReady) return 'Ready';
    return 'Initializing';
}

/**
 * Determines whether the native CameraView component should be mounted.
 */
export function shouldMountCameraView({
    requiresCamera,
    hasPermission,
}: {
    requiresCamera: boolean;
    hasPermission: boolean;
}): boolean {
    return requiresCamera && hasPermission;
}
