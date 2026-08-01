import type { DbClient } from '@sentinel/db';

/**
 * Strategy interface for document-specific PDF generation logic.
 * Encapsulates table names, template resolution settings, data gathering, rendering,
 * and state updates.
 */
export interface PdfDocumentProcessor {
    /**
     * Unique identifier for the document type.
     */
    readonly documentKind: 'ANALYTICS_OVERALL' | 'EXAM_ANSWER_KEY' | 'EXAM_RESULTS_REPORT';

    /**
     * Database table where export requests are stored.
     */
    readonly tableName: string;

    /**
     * Primary key column name of the database table.
     */
    readonly idCol: string;

    /**
     * Options to pass to resolvePdfTemplate.
     */
    readonly resolveOptions: { persistBuiltInFallback: boolean };

    /**
     * Generates the state update payload for claiming a job (transitioning to GENERATING).
     *
     * @param currentRetries number of retries prior to this attempt
     */
    getClaimUpdateSet(currentRetries: number): Record<string, any>;

    /**
     * Gathers data and renders the PDF buffer, returning the buffer and the destination storage path.
     *
     * @param dbClient database client
     * @param exportRecord raw export DB record
     * @param requestData parsed request snapshot JSON
     * @param headerConfig resolved PDF header config
     * @param footerConfig resolved PDF footer config
     * @param logoBuffer downloaded branding logo buffer (if any)
     */
    render(
        dbClient: DbClient,
        exportRecord: any,
        requestData: any,
        headerConfig: any,
        footerConfig: any,
        logoBuffer: Buffer | null,
    ): Promise<{ pdfBuffer: Buffer; storagePath: string }>;

    /**
     * Generates the state update payload for marking a job as READY.
     *
     * @param completedAt date/time of completion
     * @param bucket storage bucket name
     * @param storagePath destination storage path
     * @param resolvedTemplate resolved PDF template details
     */
    getReadyUpdateSet(
        completedAt: Date,
        bucket: string,
        storagePath: string,
        resolvedTemplate: { templateId: string | null;[key: string]: any },
    ): Record<string, any>;

    /**
     * Generates the state update payload for marking a job as FAILED.
     *
     * @param error error that occurred during processing
     */
    getFailedUpdateSet(error: any): Record<string, any>;
}
