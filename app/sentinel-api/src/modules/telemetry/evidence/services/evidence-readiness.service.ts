import {
    getEvidenceBucket,
    getEvidenceMaxBytes,
    getInstitutionAllowlist,
    isEvidenceEnabled,
} from '../evidence.constants';
import {
    EvidenceStorageService,
    type EvidenceBucketReadinessResult,
} from './evidence-storage.service';

export type EvidenceReadinessIssueCode =
    | 'EVIDENCE_DISABLED'
    | 'ALLOWLIST_EMPTY'
    | 'API_SUPABASE_URL_MISSING'
    | 'WEB_SUPABASE_URL_MISSING'
    | 'API_SUPABASE_URL_INVALID'
    | 'WEB_SUPABASE_URL_INVALID'
    | 'SUPABASE_PROJECT_MISMATCH'
    | 'BUCKET_NOT_READY';

export type EvidenceReadinessIssue = {
    code: EvidenceReadinessIssueCode;
    message: string;
};

export type EvidenceReadinessResult = {
    ready: boolean;
    evidenceEnabled: boolean;
    institutionAllowlist: string[];
    bucketName: string;
    apiSupabaseUrl: string | null;
    webSupabaseUrl: string | null;
    bucketReadiness: EvidenceBucketReadinessResult | null;
    issues: EvidenceReadinessIssue[];
};

function normalizeSupabaseProjectUrl(value: string): string | null {
    try {
        const parsed = new URL(value);
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return null;
    }
}

/**
 * Performs the non-destructive rollout verification for telemetry evidence.
 *
 * The result is safe to print in deploy logs because it never includes evidence
 * paths, object metadata, upload tokens, or signed URLs.
 */
export class EvidenceReadinessService {
    static async check(): Promise<EvidenceReadinessResult> {
        const issues: EvidenceReadinessIssue[] = [];
        const evidenceEnabled = isEvidenceEnabled();
        const institutionAllowlist = getInstitutionAllowlist();
        const bucketName = getEvidenceBucket().trim();
        const apiSupabaseUrl = process.env.SUPABASE_URL?.trim() || null;
        const webSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
        const normalizedApiSupabaseUrl = apiSupabaseUrl
            ? normalizeSupabaseProjectUrl(apiSupabaseUrl)
            : null;
        const normalizedWebSupabaseUrl = webSupabaseUrl
            ? normalizeSupabaseProjectUrl(webSupabaseUrl)
            : null;
        let bucketReadiness: EvidenceBucketReadinessResult | null = null;

        if (!evidenceEnabled) {
            issues.push({
                code: 'EVIDENCE_DISABLED',
                message: 'Telemetry evidence must be enabled before rollout verification can pass.',
            });
        }

        if (institutionAllowlist.length === 0) {
            issues.push({
                code: 'ALLOWLIST_EMPTY',
                message: 'Telemetry evidence allowlist is empty.',
            });
        }

        if (!apiSupabaseUrl) {
            issues.push({
                code: 'API_SUPABASE_URL_MISSING',
                message: 'SUPABASE_URL is required for the API service-role client.',
            });
        } else if (!normalizedApiSupabaseUrl) {
            issues.push({
                code: 'API_SUPABASE_URL_INVALID',
                message: 'SUPABASE_URL is not a valid Supabase project URL.',
            });
        }

        if (!webSupabaseUrl) {
            issues.push({
                code: 'WEB_SUPABASE_URL_MISSING',
                message: 'NEXT_PUBLIC_SUPABASE_URL is required for project alignment checks.',
            });
        } else if (!normalizedWebSupabaseUrl) {
            issues.push({
                code: 'WEB_SUPABASE_URL_INVALID',
                message: 'NEXT_PUBLIC_SUPABASE_URL is not a valid Supabase project URL.',
            });
        }

        if (
            normalizedApiSupabaseUrl &&
            normalizedWebSupabaseUrl &&
            normalizedApiSupabaseUrl !== normalizedWebSupabaseUrl
        ) {
            issues.push({
                code: 'SUPABASE_PROJECT_MISMATCH',
                message: 'API and web Supabase URLs point to different projects.',
            });
        }

        if (evidenceEnabled && bucketName) {
            bucketReadiness = await EvidenceStorageService.verifyBucketReadiness({
                bucketName,
                requiredMimeTypes: ['image/webp', 'image/jpeg'],
                minFileSizeLimitBytes: getEvidenceMaxBytes(),
            });

            if (!bucketReadiness.ready) {
                issues.push({
                    code: 'BUCKET_NOT_READY',
                    message: 'Evidence bucket metadata does not satisfy the rollout contract.',
                });
            }
        }

        return {
            ready: issues.length === 0,
            evidenceEnabled,
            institutionAllowlist,
            bucketName,
            apiSupabaseUrl,
            webSupabaseUrl,
            bucketReadiness,
            issues,
        };
    }
}
