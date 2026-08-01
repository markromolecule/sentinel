import type { ApiClientType } from '../api-client';
import type {
    DocumentKind,
    ExamAnswerKeyExport,
    ExamResultsReportExport,
    FooterConfig,
    HeaderConfig,
    InstitutionPdfBranding,
    LifecycleStatus,
    PdfReportGenerationRequest,
    PdfTemplate,
    TemplateStatus,
} from '@sentinel/shared/schema';

interface ApiResponse<T> {
    success?: boolean;
    message: string;
    data: T;
}

export interface DownloadResponse {
    success: boolean;
    downloadUrl: string;
}

export interface SuccessMessageResponse {
    success?: boolean;
    message: string;
}

export interface GetPdfTemplatesParams {
    institutionId?: string | null;
    documentKind?: DocumentKind;
    status?: TemplateStatus;
}

export interface UpsertPdfTemplateDraftBody {
    institution_id?: string | null;
    document_kind: DocumentKind;
    header_config: HeaderConfig;
    footer_config: FooterConfig;
}

export interface PreviewPdfTemplateBody extends UpsertPdfTemplateDraftBody {}

export interface ListAnswerKeyExportsParams {
    examId?: string;
    institutionId?: string;
    page?: number;
    limit?: number;
}

export interface CreateAnswerKeyExportBody {
    exam_id: string;
    institution_id: string;
    title?: string;
}

export interface ListExamReportExportsParams {
    examId?: string;
    institutionId?: string;
    page?: number;
    limit?: number;
}

export interface CreateExamReportExportBody {
    exam_id: string;
    title?: string;
}

export interface PaginatedAnswerKeyExports {
    records: ExamAnswerKeyExportRecord[];
    total_records: number;
    limit: number;
    page: number;
}

export interface ExamAnswerKeyExportRecord {
    exportId: string;
    examId: string;
    institutionId: string;
    templateId: string | null;
    status: LifecycleStatus;
    failureCode: string | null;
    failureMessage: string | null;
    retryCount: number;
    storageBucket: string | null;
    storagePath: string | null;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
}

export interface PaginatedExamReportExports {
    records: ExamResultsReportExportRecord[];
    total_records: number;
    limit: number;
    page: number;
}

export interface ExamResultsReportExportRecord {
    exportId: string;
    examId: string;
    institutionId: string;
    templateId: string | null;
    status: LifecycleStatus;
    failureCode: string | null;
    failureMessage: string | null;
    retryCount: number;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    expiresAt: string | null;
}

export interface PublishPdfTemplateResponse {
    message: string;
    template_id: string;
    version: number;
}

export interface UpsertPdfTemplateDraftResponse {
    message: string;
    template_id: string;
}

function buildQueryString(params?: object): string {
    if (!params) {
        return '';
    }

    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(
        params as Record<string, string | number | null | undefined>,
    )) {
        if (value === undefined || value === null || value === '') {
            continue;
        }

        searchParams.set(key, String(value));
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
}

/**
 * Lists PDF template records for the requested scope and document kind.
 */
export async function getPdfTemplates(
    apiClient: ApiClientType,
    params?: GetPdfTemplatesParams,
): Promise<PdfTemplate[]> {
    const query = buildQueryString(params);
    const response: ApiResponse<PdfTemplate[]> = await apiClient(
        `/pdf-documents/templates${query}`,
    );
    return response.data;
}

/**
 * Saves or updates a draft PDF template definition.
 */
export async function upsertPdfTemplateDraft(
    apiClient: ApiClientType,
    payload: UpsertPdfTemplateDraftBody,
): Promise<UpsertPdfTemplateDraftResponse> {
    const response: UpsertPdfTemplateDraftResponse = await apiClient(
        '/pdf-documents/templates/draft',
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

    return response;
}

/**
 * Publishes the requested draft template.
 */
export async function publishPdfTemplate(
    apiClient: ApiClientType,
    templateId: string,
): Promise<PublishPdfTemplateResponse> {
    const response: PublishPdfTemplateResponse = await apiClient(
        `/pdf-documents/templates/${templateId}/publish`,
        {
            method: 'POST',
        },
    );

    return response;
}

/**
 * Removes an institution draft override for the given document kind.
 */
export async function deletePdfTemplateOverride(
    apiClient: ApiClientType,
    params: {
        institutionId: string;
        documentKind: DocumentKind;
    },
): Promise<SuccessMessageResponse> {
    const query = buildQueryString(params);
    const response: SuccessMessageResponse = await apiClient(
        `/pdf-documents/templates/override${query}`,
        {
            method: 'DELETE',
        },
    );

    return response;
}

/**
 * Requests a one-off PDF preview blob for the supplied header/footer config.
 */
export async function previewPdfTemplate(
    apiClient: ApiClientType,
    payload: PreviewPdfTemplateBody,
): Promise<Blob> {
    const response = await apiClient('/pdf-documents/templates/preview', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return response as Blob;
}

/**
 * Reads the current institution branding metadata.
 */
export async function getInstitutionPdfBranding(
    apiClient: ApiClientType,
    institutionId: string,
): Promise<InstitutionPdfBranding> {
    const response: ApiResponse<InstitutionPdfBranding> = await apiClient(
        `/pdf-documents/institutions/${institutionId}/branding`,
    );

    return response.data;
}

/**
 * Uploads a replacement branding logo for an institution.
 */
export async function uploadInstitutionPdfBranding(
    apiClient: ApiClientType,
    institutionId: string,
    logo: File,
): Promise<InstitutionPdfBranding> {
    const formData = new FormData();
    formData.append('logo', logo);

    const response: ApiResponse<InstitutionPdfBranding> = await apiClient(
        `/pdf-documents/institutions/${institutionId}/branding`,
        {
            method: 'POST',
            body: formData,
        },
    );

    return response.data;
}

/**
 * Deletes the current institution branding record and logo object.
 */
export async function deleteInstitutionPdfBranding(
    apiClient: ApiClientType,
    institutionId: string,
): Promise<SuccessMessageResponse> {
    const response: SuccessMessageResponse = await apiClient(
        `/pdf-documents/institutions/${institutionId}/branding`,
        {
            method: 'DELETE',
        },
    );

    return response;
}

/**
 * Creates a queued answer-key export.
 */
export async function createAnswerKeyExport(
    apiClient: ApiClientType,
    payload: CreateAnswerKeyExportBody,
): Promise<ExamAnswerKeyExportRecord> {
    const response: ApiResponse<ExamAnswerKeyExportRecord> = await apiClient(
        '/pdf-documents/answer-keys',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

    return response.data;
}

/**
 * Lists answer-key export records for an institution or exam.
 */
export async function getAnswerKeyExports(
    apiClient: ApiClientType,
    params?: ListAnswerKeyExportsParams,
): Promise<PaginatedAnswerKeyExports> {
    const query = buildQueryString(params);
    const response: ApiResponse<PaginatedAnswerKeyExports> = await apiClient(
        `/pdf-documents/answer-keys${query}`,
    );

    return response.data;
}

/**
 * Fetches the latest status for a single answer-key export.
 */
export async function getAnswerKeyExportStatus(
    apiClient: ApiClientType,
    exportId: string,
): Promise<ExamAnswerKeyExportRecord> {
    const response: ApiResponse<ExamAnswerKeyExportRecord> = await apiClient(
        `/pdf-documents/answer-keys/${exportId}/status`,
    );

    return response.data;
}

/**
 * Requests a fresh signed download URL for an answer-key export.
 */
export async function getAnswerKeyExportDownload(
    apiClient: ApiClientType,
    exportId: string,
): Promise<DownloadResponse> {
    const response: DownloadResponse = await apiClient(
        `/pdf-documents/answer-keys/${exportId}/download`,
    );

    return response;
}

/**
 * Resets a failed answer-key export and requeues background generation.
 */
export async function retryAnswerKeyExport(
    apiClient: ApiClientType,
    exportId: string,
): Promise<SuccessMessageResponse> {
    const response: SuccessMessageResponse = await apiClient(
        `/pdf-documents/answer-keys/${exportId}/retry`,
        {
            method: 'POST',
        },
    );

    return response;
}

/**
 * Deletes an answer-key export record and any stored artifact.
 */
export async function deleteAnswerKeyExport(
    apiClient: ApiClientType,
    exportId: string,
): Promise<SuccessMessageResponse> {
    const response: SuccessMessageResponse = await apiClient(
        `/pdf-documents/answer-keys/${exportId}`,
        {
            method: 'DELETE',
        },
    );

    return response;
}

/**
 * Creates a queued exam results report export.
 */
export async function createExamReportExport(
    apiClient: ApiClientType,
    payload: CreateExamReportExportBody,
): Promise<ExamResultsReportExportRecord> {
    const response: ApiResponse<ExamResultsReportExportRecord> = await apiClient(
        '/pdf-documents/exam-reports',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

    return response.data;
}

/**
 * Lists exam results report export records for an institution or exam.
 */
export async function getExamReportExports(
    apiClient: ApiClientType,
    params?: ListExamReportExportsParams,
): Promise<PaginatedExamReportExports> {
    const query = buildQueryString(params);
    const response: ApiResponse<PaginatedExamReportExports> = await apiClient(
        `/pdf-documents/exam-reports${query}`,
    );

    return response.data;
}

/**
 * Fetches the latest status for a single exam results report export.
 */
export async function getExamReportExportStatus(
    apiClient: ApiClientType,
    exportId: string,
): Promise<ExamResultsReportExportRecord> {
    const response: ApiResponse<ExamResultsReportExportRecord> = await apiClient(
        `/pdf-documents/exam-reports/${exportId}/status`,
    );

    return response.data;
}

/**
 * Requests a fresh signed download URL for an exam results report export.
 */
export async function getExamReportExportDownload(
    apiClient: ApiClientType,
    exportId: string,
): Promise<DownloadResponse> {
    const response: DownloadResponse = await apiClient(
        `/pdf-documents/exam-reports/${exportId}/download`,
    );

    return response;
}

/**
 * Resets a failed exam results report export and requeues background generation.
 */
export async function retryExamReportExport(
    apiClient: ApiClientType,
    exportId: string,
): Promise<SuccessMessageResponse> {
    const response: SuccessMessageResponse = await apiClient(
        `/pdf-documents/exam-reports/${exportId}/retry`,
        {
            method: 'POST',
        },
    );

    return response;
}

/**
 * Deletes an exam results report export record and any stored artifact.
 */
export async function deleteExamReportExport(
    apiClient: ApiClientType,
    exportId: string,
): Promise<SuccessMessageResponse> {
    const response: SuccessMessageResponse = await apiClient(
        `/pdf-documents/exam-reports/${exportId}`,
        {
            method: 'DELETE',
        },
    );

    return response;
}

/**
 * Requests a fresh signed URL for an analytics export artifact.
 */
export async function getPdfExportDownload(
    apiClient: ApiClientType,
    exportId: string,
): Promise<DownloadResponse> {
    const response: DownloadResponse = await apiClient(
        `/pdf-documents/exports/${exportId}/download`,
    );

    return response;
}

/**
 * Resets a failed analytics export and requeues background generation.
 */
export async function retryPdfExport(
    apiClient: ApiClientType,
    exportId: string,
): Promise<SuccessMessageResponse> {
    const response: SuccessMessageResponse = await apiClient(
        `/pdf-documents/exports/${exportId}/retry`,
        {
            method: 'POST',
        },
    );

    return response;
}

export type {
    DocumentKind,
    ExamAnswerKeyExport,
    ExamResultsReportExport,
    FooterConfig,
    HeaderConfig,
    InstitutionPdfBranding,
    LifecycleStatus,
    PdfReportGenerationRequest,
    PdfTemplate,
    TemplateStatus,
};
