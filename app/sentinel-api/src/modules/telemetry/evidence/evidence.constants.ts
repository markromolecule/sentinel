/**
 * Telemetry Incident Evidence Constants & Environment Parsers
 * Parses environment variables for evidence handling and fails closed if invalid.
 */

/**
 * Gets the current boolean value of TELEMETRY_EVIDENCE_ENABLED.
 * Defaults to false.
 */
export function isEvidenceEnabled(): boolean {
    return process.env.TELEMETRY_EVIDENCE_ENABLED === 'true';
}

/**
 * Parses and returns the list of allowed institution IDs.
 * Returns empty array if unset or invalid.
 */
export function getInstitutionAllowlist(): string[] {
    const listStr = process.env.TELEMETRY_EVIDENCE_INSTITUTION_ALLOWLIST;
    if (!listStr) return [];
    return listStr
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

/**
 * Checks if a given institution is in the allowlist.
 * If the allowlist is empty, no institution is allowed (fails closed).
 */
export function isInstitutionAllowed(institutionId: string): boolean {
    if (!isEvidenceEnabled()) return false;
    const allowlist = getInstitutionAllowlist();
    return allowlist.includes(institutionId);
}

/**
 * Gets the Supabase bucket name for evidence storage.
 * Defaults to 'sentinel-proctoring-evidence'.
 */
export function getEvidenceBucket(): string {
    return process.env.TELEMETRY_EVIDENCE_BUCKET || 'sentinel-proctoring-evidence';
}

/**
 * Parses a numeric environment variable with a fallback and a safety bound.
 * Returns fallback if invalid or out of bounds.
 */
function parseNumericEnv(
    value: string | undefined,
    fallback: number,
    min: number,
    max: number
): number {
    if (value === undefined) return fallback;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < min || parsed > max) {
        return fallback;
    }
    return parsed;
}

/**
 * Gets the number of days to retain evidence images.
 * Safe range: 1 to 365 days. Default: 7 days.
 */
export function getEvidenceRetentionDays(): number {
    return parseNumericEnv(process.env.TELEMETRY_EVIDENCE_RETENTION_DAYS, 7, 1, 365);
}

/**
 * Gets the maximum allowed image dimension (width or height in pixels).
 * Safe range: 100 to 3840 pixels. Default: 1280.
 */
export function getEvidenceMaxDimension(): number {
    return parseNumericEnv(process.env.TELEMETRY_EVIDENCE_MAX_DIMENSION, 1280, 100, 3840);
}

/**
 * Gets the maximum allowed file size in bytes for uploaded evidence.
 * Safe range: 1024 (1KB) to 10485760 (10MB). Default: 524288 (512KB).
 */
export function getEvidenceMaxBytes(): number {
    return parseNumericEnv(process.env.TELEMETRY_EVIDENCE_MAX_BYTES, 524288, 1024, 10485760);
}

/**
 * Gets the maximum evidence count permitted per telemetry event type (e.g. GAZE) within an attempt.
 * Safe range: 1 to 100. Default: 10.
 */
export function getEvidenceMaxPerEventType(): number {
    return parseNumericEnv(process.env.TELEMETRY_EVIDENCE_MAX_PER_EVENT_TYPE, 10, 1, 100);
}

/**
 * Gets the absolute limit of evidence objects allowed per attempt.
 * Safe range: 1 to 1000. Default: 30.
 */
export function getEvidenceMaxPerAttempt(): number {
    return parseNumericEnv(process.env.TELEMETRY_EVIDENCE_MAX_PER_ATTEMPT, 30, 1, 1000);
}

/**
 * Gets the TTL for short-lived upload signed URLs in seconds.
 * Safe range: 10 to 3600 seconds. Default: 120 seconds.
 */
export function getEvidenceUploadTtlSeconds(): number {
    return parseNumericEnv(process.env.TELEMETRY_EVIDENCE_UPLOAD_TTL_SECONDS, 120, 10, 3600);
}

/**
 * Gets the TTL for short-lived view signed URLs in seconds.
 * Safe range: 10 to 86400 seconds. Default: 300 seconds.
 */
export function getEvidenceViewTtlSeconds(): number {
    return parseNumericEnv(process.env.TELEMETRY_EVIDENCE_VIEW_TTL_SECONDS, 300, 10, 86400);
}
