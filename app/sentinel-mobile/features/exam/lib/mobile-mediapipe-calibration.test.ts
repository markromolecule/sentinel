import { describe, it, expect } from 'vitest';
import {
    evaluateMobileCheckupFrame,
    isMobileCalibrationStable,
    buildMobileCalibrationProfile,
} from './mobile-mediapipe-calibration';
import {
    createMediaPipeCalibrationSample,
    type MediaPipeCalibrationSample,
} from '@sentinel/shared';

// Simple helper to create base face landmarks at a specific position
function createMockLandmarks(centerX = 0.5, centerY = 0.45, irisOffset = 0.43): any[] {
    const landmarks = Array.from({ length: 478 }, () => ({ x: centerX, y: centerY, z: 0 }));
    // Setup landmark coordinates required for bounds/eyes/iris calculations in evaluateMediaPipeCalibrationCandidate
    landmarks[1] = { x: centerX, y: centerY - 0.02, z: 0 };
    landmarks[33] = { x: centerX - 0.1, y: centerY - 0.04, z: 0 };
    landmarks[133] = { x: centerX - 0.04, y: centerY - 0.04, z: 0 };
    landmarks[263] = { x: centerX + 0.1, y: centerY - 0.04, z: 0 };
    landmarks[362] = { x: centerX + 0.04, y: centerY - 0.04, z: 0 };
    // Open eyes landmarks
    landmarks[160] = { x: centerX - 0.09, y: centerY - 0.048, z: 0 };
    landmarks[159] = { x: centerX - 0.07, y: centerY - 0.049, z: 0 };
    landmarks[158] = { x: centerX - 0.05, y: centerY - 0.048, z: 0 };
    landmarks[144] = { x: centerX - 0.09, y: centerY - 0.032, z: 0 };
    landmarks[145] = { x: centerX - 0.07, y: centerY - 0.031, z: 0 };
    landmarks[153] = { x: centerX - 0.05, y: centerY - 0.032, z: 0 };
    landmarks[387] = { x: centerX + 0.05, y: centerY - 0.048, z: 0 };
    landmarks[386] = { x: centerX + 0.07, y: centerY - 0.049, z: 0 };
    landmarks[385] = { x: centerX + 0.09, y: centerY - 0.048, z: 0 };
    landmarks[373] = { x: centerX + 0.05, y: centerY - 0.032, z: 0 };
    landmarks[374] = { x: centerX + 0.07, y: centerY - 0.031, z: 0 };
    landmarks[380] = { x: centerX + 0.09, y: centerY - 0.032, z: 0 };
    landmarks[168] = { x: centerX, y: centerY - 0.15, z: 0 };
    landmarks[152] = { x: centerX, y: centerY + 0.2, z: 0 };

    [468, 469, 470, 471, 472].forEach((index) => {
        landmarks[index] = { x: irisOffset, y: centerY - 0.04, z: 0 };
    });
    [473, 474, 475, 476, 477].forEach((index) => {
        landmarks[index] = { x: irisOffset + 0.14, y: centerY - 0.04, z: 0 };
    });
    return landmarks;
}

describe('mobile-mediapipe-calibration', () => {
    describe('evaluateMobileCheckupFrame', () => {
        it('should flag frame with invalid (no face) status', () => {
            const result = evaluateMobileCheckupFrame({
                landmarksByFace: [],
                confidenceThreshold: 0.6,
            });
            expect(result.analysis.status).toBe('no-face');
            expect(result.evaluation.isValid).toBe(false);
            expect(result.evaluation.details).toBe('No face detected in the camera frame.');
        });

        it('should flag frame with multiple faces', () => {
            const landmarks1 = createMockLandmarks();
            const landmarks2 = createMockLandmarks();
            const result = evaluateMobileCheckupFrame({
                landmarksByFace: [landmarks1, landmarks2],
                confidenceThreshold: 0.6,
            });
            expect(result.analysis.status).toBe('multiple-faces');
            expect(result.evaluation.isValid).toBe(false);
            expect(result.evaluation.details).toBe('Multiple faces detected in the camera frame.');
        });

        it('should accept valid centered face frame', () => {
            const landmarks = createMockLandmarks();
            const result = evaluateMobileCheckupFrame({
                landmarksByFace: [landmarks],
                confidenceThreshold: 0.6,
            });
            expect(result.analysis.status).toBe('ready');
            expect(result.evaluation.isValid).toBe(true);
        });
    });

    describe('isMobileCalibrationStable', () => {
        it('should return true if previous sample is null', () => {
            const landmarks = createMockLandmarks();
            const sample = createMediaPipeCalibrationSample({
                landmarks,
                confidenceScore: 0.9,
            }) as MediaPipeCalibrationSample;

            expect(isMobileCalibrationStable(null, sample)).toBe(true);
        });

        it('should return true for stable samples with small delta', () => {
            const l1 = createMockLandmarks(0.5, 0.45, 0.43);
            const l2 = createMockLandmarks(0.51, 0.46, 0.44); // small center shift (delta 0.02)
            const s1 = createMediaPipeCalibrationSample({
                landmarks: l1,
                confidenceScore: 0.9,
            }) as MediaPipeCalibrationSample;
            const s2 = createMediaPipeCalibrationSample({
                landmarks: l2,
                confidenceScore: 0.9,
            }) as MediaPipeCalibrationSample;

            expect(isMobileCalibrationStable(s1, s2)).toBe(true);
        });

        it('should return false for unstable samples with large delta', () => {
            const l1 = createMockLandmarks(0.5, 0.45, 0.43);
            const l2 = createMockLandmarks(0.65, 0.45, 0.58); // large center shift (delta 0.15 > 0.08)
            const s1 = createMediaPipeCalibrationSample({
                landmarks: l1,
                confidenceScore: 0.9,
            }) as MediaPipeCalibrationSample;
            const s2 = createMediaPipeCalibrationSample({
                landmarks: l2,
                confidenceScore: 0.9,
            }) as MediaPipeCalibrationSample;

            expect(isMobileCalibrationStable(s1, s2)).toBe(false);
        });
    });

    describe('buildMobileCalibrationProfile', () => {
        it('should build calibration profile from samples', () => {
            const landmarks = createMockLandmarks();
            const sample = createMediaPipeCalibrationSample({
                landmarks,
                confidenceScore: 0.9,
            }) as MediaPipeCalibrationSample;

            const profile = buildMobileCalibrationProfile({ samples: [sample] });
            expect(profile).not.toBeNull();
            expect(profile?.sampleCount).toBe(1);
            expect(profile?.version).toBe(1);
        });
    });
});
