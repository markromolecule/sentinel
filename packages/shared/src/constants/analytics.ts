export const ANALYTICS_QUERY_KEYS = {
    all: ['analytics'] as const,
    kpis: (institutionId?: string) =>
        [...ANALYTICS_QUERY_KEYS.all, 'kpis', institutionId ?? ''] as const,
    incidentSeverity: (institutionId?: string) =>
        [...ANALYTICS_QUERY_KEYS.all, 'incidentSeverity', institutionId ?? ''] as const,
    incidentType: (institutionId?: string) =>
        [...ANALYTICS_QUERY_KEYS.all, 'incidentType', institutionId ?? ''] as const,
    departmentIntegrity: (institutionId?: string) =>
        [...ANALYTICS_QUERY_KEYS.all, 'departmentIntegrity', institutionId ?? ''] as const,
    reports: (institutionId?: string | null, page?: number, limit?: number, status?: string) =>
        [
            ...ANALYTICS_QUERY_KEYS.all,
            'reports',
            { institutionId: institutionId ?? '', page, limit, status },
        ] as const,
    examCompletions: (institutionId?: string) =>
        [...ANALYTICS_QUERY_KEYS.all, 'examCompletions', institutionId ?? ''] as const,
    incidentTrends: (institutionId?: string) =>
        [...ANALYTICS_QUERY_KEYS.all, 'incidentTrends', institutionId ?? ''] as const,
    pdfTemplates: (institutionId?: string | null, documentKind?: string, status?: string) =>
        [
            ...ANALYTICS_QUERY_KEYS.all,
            'pdfTemplates',
            { institutionId: institutionId ?? '', documentKind, status },
        ] as const,
    resolvedPdfTemplate: (institutionId?: string | null, documentKind?: string, status?: string) =>
        [
            ...ANALYTICS_QUERY_KEYS.all,
            'resolvedPdfTemplate',
            { institutionId: institutionId ?? '', documentKind, status },
        ] as const,
    pdfBranding: (institutionId?: string | null) =>
        [...ANALYTICS_QUERY_KEYS.all, 'pdfBranding', institutionId ?? ''] as const,
    answerKeyExports: (institutionId?: string, examId?: string, page?: number, limit?: number) =>
        [
            ...ANALYTICS_QUERY_KEYS.all,
            'answerKeyExports',
            { institutionId: institutionId ?? '', examId: examId ?? '', page, limit },
        ] as const,
    answerKeyExportStatus: (exportId?: string | null) =>
        [...ANALYTICS_QUERY_KEYS.all, 'answerKeyExportStatus', exportId ?? ''] as const,
    examReportExports: (examId?: string, page?: number, limit?: number, institutionId?: string) =>
        [
            ...ANALYTICS_QUERY_KEYS.all,
            'examReportExports',
            { examId: examId ?? '', page, limit, institutionId: institutionId ?? '' },
        ] as const,
    examReportExportStatus: (examId?: string, exportId?: string | null) =>
        [
            ...ANALYTICS_QUERY_KEYS.all,
            'examReportExportStatus',
            { examId: examId ?? '', exportId: exportId ?? '' },
        ] as const,
} as const;

export const ANALYTICS_MUTATION_KEYS = {
    generateReport: () => [...ANALYTICS_QUERY_KEYS.all, 'generateReport'] as const,
    saveTemplateDraft: () => [...ANALYTICS_QUERY_KEYS.all, 'saveTemplateDraft'] as const,
    publishTemplate: () => [...ANALYTICS_QUERY_KEYS.all, 'publishTemplate'] as const,
    resetTemplateOverride: () => [...ANALYTICS_QUERY_KEYS.all, 'resetTemplateOverride'] as const,
    uploadBrandingLogo: () => [...ANALYTICS_QUERY_KEYS.all, 'uploadBrandingLogo'] as const,
    deleteBrandingLogo: () => [...ANALYTICS_QUERY_KEYS.all, 'deleteBrandingLogo'] as const,
    exportAnswerKey: () => [...ANALYTICS_QUERY_KEYS.all, 'exportAnswerKey'] as const,
    deleteAnswerKey: () => [...ANALYTICS_QUERY_KEYS.all, 'deleteAnswerKey'] as const,
    exportExamReport: () => [...ANALYTICS_QUERY_KEYS.all, 'exportExamReport'] as const,
    retryExamReportExport: () => [...ANALYTICS_QUERY_KEYS.all, 'retryExamReportExport'] as const,
    deleteExamReportExport: () => [...ANALYTICS_QUERY_KEYS.all, 'deleteExamReportExport'] as const,
} as const;
