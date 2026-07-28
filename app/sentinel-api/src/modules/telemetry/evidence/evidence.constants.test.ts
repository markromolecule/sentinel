import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    isEvidenceEnabled,
    getInstitutionAllowlist,
    isInstitutionAllowed,
    getEvidenceBucket,
    getEvidenceRetentionDays,
    getEvidenceMaxDimension,
    getEvidenceMaxBytes,
    getEvidenceMaxPerEventType,
    getEvidenceMaxPerAttempt,
    getEvidenceUploadTtlSeconds,
    getEvidenceViewTtlSeconds,
} from './evidence.constants';

describe('telemetry incident evidence constants', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Clear all TELEMETRY_EVIDENCE env vars
        Object.keys(process.env).forEach((key) => {
            if (key.startsWith('TELEMETRY_EVIDENCE_')) {
                delete process.env[key];
            }
        });
    });

    afterEach(() => {
        // Restore original env vars
        process.env = { ...originalEnv };
    });

    it('returns default values when environment is empty', () => {
        expect(isEvidenceEnabled()).toBe(false);
        expect(getInstitutionAllowlist()).toEqual([]);
        expect(isInstitutionAllowed('inst-1')).toBe(false);
        expect(getEvidenceBucket()).toBe('sentinel-proctoring-evidence');
        expect(getEvidenceRetentionDays()).toBe(7);
        expect(getEvidenceMaxDimension()).toBe(1280);
        expect(getEvidenceMaxBytes()).toBe(524288);
        expect(getEvidenceMaxPerEventType()).toBe(10);
        expect(getEvidenceMaxPerAttempt()).toBe(30);
        expect(getEvidenceUploadTtlSeconds()).toBe(120);
        expect(getEvidenceViewTtlSeconds()).toBe(300);
    });

    it('correctly parses environment overrides', () => {
        process.env.TELEMETRY_EVIDENCE_ENABLED = 'true';
        process.env.TELEMETRY_EVIDENCE_INSTITUTION_ALLOWLIST = 'inst-1, inst-2 ,inst-3';
        process.env.TELEMETRY_EVIDENCE_BUCKET = 'custom-evidence-bucket';
        process.env.TELEMETRY_EVIDENCE_RETENTION_DAYS = '14';
        process.env.TELEMETRY_EVIDENCE_MAX_DIMENSION = '1920';
        process.env.TELEMETRY_EVIDENCE_MAX_BYTES = '1048576';
        process.env.TELEMETRY_EVIDENCE_MAX_PER_EVENT_TYPE = '5';
        process.env.TELEMETRY_EVIDENCE_MAX_PER_ATTEMPT = '50';
        process.env.TELEMETRY_EVIDENCE_UPLOAD_TTL_SECONDS = '60';
        process.env.TELEMETRY_EVIDENCE_VIEW_TTL_SECONDS = '600';

        expect(isEvidenceEnabled()).toBe(true);
        expect(getInstitutionAllowlist()).toEqual(['inst-1', 'inst-2', 'inst-3']);
        expect(isInstitutionAllowed('inst-1')).toBe(true);
        expect(isInstitutionAllowed('inst-2')).toBe(true);
        expect(isInstitutionAllowed('inst-4')).toBe(false);
        expect(getEvidenceBucket()).toBe('custom-evidence-bucket');
        expect(getEvidenceRetentionDays()).toBe(14);
        expect(getEvidenceMaxDimension()).toBe(1920);
        expect(getEvidenceMaxBytes()).toBe(1048576);
        expect(getEvidenceMaxPerEventType()).toBe(5);
        expect(getEvidenceMaxPerAttempt()).toBe(50);
        expect(getEvidenceUploadTtlSeconds()).toBe(60);
        expect(getEvidenceViewTtlSeconds()).toBe(600);
    });

    it('fails closed / returns defaults when values are invalid', () => {
        process.env.TELEMETRY_EVIDENCE_ENABLED = 'not-a-boolean';
        process.env.TELEMETRY_EVIDENCE_RETENTION_DAYS = 'invalid-number';
        process.env.TELEMETRY_EVIDENCE_MAX_DIMENSION = '99999'; // Out of bounds max
        process.env.TELEMETRY_EVIDENCE_MAX_BYTES = '0'; // Out of bounds min

        expect(isEvidenceEnabled()).toBe(false);
        expect(getEvidenceRetentionDays()).toBe(7);
        expect(getEvidenceMaxDimension()).toBe(1280);
        expect(getEvidenceMaxBytes()).toBe(524288);
    });

    it('fails closed for institution check if telemetry is disabled even if allowlisted', () => {
        process.env.TELEMETRY_EVIDENCE_ENABLED = 'false';
        process.env.TELEMETRY_EVIDENCE_INSTITUTION_ALLOWLIST = 'inst-1';

        expect(isInstitutionAllowed('inst-1')).toBe(false);
    });
});
