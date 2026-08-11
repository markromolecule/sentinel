import { describe, it, expect } from 'vitest';
import { createMobileAudioAnalyzer, evaluateMobileAudioLevel } from './mobile-audio-anomaly';

describe('mobile-audio-anomaly', () => {
    describe('createMobileAudioAnalyzer', () => {
        it('should create an analyzer with default settings', () => {
            const analyzer = createMobileAudioAnalyzer();
            expect(analyzer.sampleRate).toBe(44100);
            expect(analyzer.numberOfChannels).toBe(1);
            expect(analyzer.isMeteringEnabled).toBe(true);
            expect(analyzer.silenceFloorDb).toBe(-60);
        });

        it('should override default settings if options are provided', () => {
            const analyzer = createMobileAudioAnalyzer({
                sampleRate: 16000,
                numberOfChannels: 2,
                silenceFloorDb: -80,
            });
            expect(analyzer.sampleRate).toBe(16000);
            expect(analyzer.numberOfChannels).toBe(2);
            expect(analyzer.silenceFloorDb).toBe(-80);
        });
    });

    describe('evaluateMobileAudioLevel', () => {
        it('should correctly normalize decibel values', () => {
            // Halfway between -60dB (silence) and 0dB (peak) is -30dB (0.5 normalized)
            const result = evaluateMobileAudioLevel(-30);
            expect(result.normalizedLevel).toBeCloseTo(0.5, 5);
        });

        it('should clamp values below silence floor to 0', () => {
            const result = evaluateMobileAudioLevel(-120);
            expect(result.normalizedLevel).toBe(0);
        });

        it('should clamp values above peak to 1', () => {
            const result = evaluateMobileAudioLevel(10);
            expect(result.normalizedLevel).toBe(1);
        });

        it('should detect silence when level is below threshold', () => {
            const result = evaluateMobileAudioLevel(-59.5); // normalized level is 0.5/60 ~ 0.0083
            expect(result.isSilence).toBe(true);
            expect(result.isVoiceActivity).toBe(false);
        });

        it('should detect voice activity when level is above threshold', () => {
            const result = evaluateMobileAudioLevel(-10); // normalized level is 50/60 ~ 0.833
            expect(result.isSilence).toBe(false);
            expect(result.isVoiceActivity).toBe(true);
        });

        it('should support custom thresholds', () => {
            const result = evaluateMobileAudioLevel(-45, {
                silenceFloorDb: -100, // range is 100, -45 is 55/100 = 0.55 normalized
                voiceThreshold: 0.6,
            });
            expect(result.normalizedLevel).toBe(0.55);
            expect(result.isVoiceActivity).toBe(false);
        });
    });
});
