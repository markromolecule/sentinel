import { OpenAPIHono } from '@hono/zod-openapi';
import { type HonoEnv } from '../../../types/hono';
import { authMiddleware } from '../../../middleware/auth';

import {
    getPdfTemplatesRoute,
    getPdfTemplatesHandler,
} from './controllers/templates/get-pdf-templates.controller';
import {
    upsertTemplateDraftRoute,
    upsertTemplateDraftHandler,
} from './controllers/templates/upsert-pdf-template-draft.controller';
import {
    publishTemplateRoute,
    publishTemplateHandler,
} from './controllers/templates/publish-pdf-template.controller';
import {
    deleteTemplateOverrideRoute,
    deleteTemplateOverrideHandler,
} from './controllers/templates/delete-pdf-template-override.controller';
import {
    getBrandingRoute,
    getBrandingHandler,
} from './controllers/branding/get-institution-branding.controller';
import {
    uploadBrandingRoute,
    uploadBrandingHandler,
} from './controllers/branding/upload-institution-branding.controller';
import {
    deleteBrandingRoute,
    deleteBrandingHandler,
} from './controllers/branding/delete-institution-branding.controller';
import {
    previewPdfTemplateRoute,
    previewPdfTemplateHandler,
} from './controllers/templates/preview-pdf-template.controller';
import {
    getPdfExportDownloadRoute,
    getPdfExportDownloadHandler,
} from './controllers/get-pdf-export-download.controller';
import {
    postPdfExportRetryRoute,
    postPdfExportRetryHandler,
} from './controllers/post-pdf-export-retry.controller';
import {
    postCreateAnswerKeyExportRoute,
    postCreateAnswerKeyExportHandler,
} from './controllers/answer-keys/post-create-answer-key-export.controller';
import {
    getAnswerKeyExportsRoute,
    getAnswerKeyExportsHandler,
} from './controllers/answer-keys/get-answer-key-exports.controller';
import {
    getAnswerKeyExportStatusRoute,
    getAnswerKeyExportStatusHandler,
} from './controllers/answer-keys/get-answer-key-export-status.controller';
import {
    postAnswerKeyExportRetryRoute,
    postAnswerKeyExportRetryHandler,
} from './controllers/answer-keys/post-answer-key-export-retry.controller';
import {
    getAnswerKeyExportDownloadRoute,
    getAnswerKeyExportDownloadHandler,
} from './controllers/answer-keys/get-answer-key-export-download.controller';
import {
    deleteAnswerKeyExportRoute,
    deleteAnswerKeyExportHandler,
} from './controllers/answer-keys/delete-answer-key-export.controller';
import {
    postCreateExamReportExportRoute,
    postCreateExamReportExportHandler,
} from './controllers/exam-reports/post-create-exam-report-export.controller';
import {
    getExamReportExportsRoute,
    getExamReportExportsHandler,
} from './controllers/exam-reports/get-exam-report-exports.controller';
import {
    getExamReportExportStatusRoute,
    getExamReportExportStatusHandler,
} from './controllers/exam-reports/get-exam-report-export-status.controller';
import {
    postExamReportExportRetryRoute,
    postExamReportExportRetryHandler,
} from './controllers/exam-reports/post-exam-report-export-retry.controller';
import {
    getExamReportExportDownloadRoute,
    getExamReportExportDownloadHandler,
} from './controllers/exam-reports/get-exam-report-export-download.controller';
import {
    deleteExamReportExportRoute,
    deleteExamReportExportHandler,
} from './controllers/exam-reports/delete-exam-report-export.controller';

const pdfDocumentsRoutes = new OpenAPIHono<HonoEnv>();

pdfDocumentsRoutes.use('*', authMiddleware);

pdfDocumentsRoutes
    .openapi(getPdfTemplatesRoute, getPdfTemplatesHandler)
    .openapi(upsertTemplateDraftRoute, upsertTemplateDraftHandler)
    .openapi(publishTemplateRoute, publishTemplateHandler)
    .openapi(deleteTemplateOverrideRoute, deleteTemplateOverrideHandler)
    .openapi(getBrandingRoute, getBrandingHandler)
    .openapi(uploadBrandingRoute, uploadBrandingHandler)
    .openapi(deleteBrandingRoute, deleteBrandingHandler)
    .openapi(previewPdfTemplateRoute, previewPdfTemplateHandler)
    .openapi(getPdfExportDownloadRoute, getPdfExportDownloadHandler)
    .openapi(postPdfExportRetryRoute, postPdfExportRetryHandler)
    // Answer Key export routes
    .openapi(postCreateAnswerKeyExportRoute, postCreateAnswerKeyExportHandler)
    .openapi(getAnswerKeyExportsRoute, getAnswerKeyExportsHandler)
    .openapi(getAnswerKeyExportStatusRoute, getAnswerKeyExportStatusHandler)
    .openapi(postAnswerKeyExportRetryRoute, postAnswerKeyExportRetryHandler)
    .openapi(getAnswerKeyExportDownloadRoute, getAnswerKeyExportDownloadHandler)
    .openapi(deleteAnswerKeyExportRoute, deleteAnswerKeyExportHandler)
    // Exam Report export routes
    .openapi(postCreateExamReportExportRoute, postCreateExamReportExportHandler)
    .openapi(getExamReportExportsRoute, getExamReportExportsHandler)
    .openapi(getExamReportExportStatusRoute, getExamReportExportStatusHandler)
    .openapi(postExamReportExportRetryRoute, postExamReportExportRetryHandler)
    .openapi(getExamReportExportDownloadRoute, getExamReportExportDownloadHandler)
    .openapi(deleteExamReportExportRoute, deleteExamReportExportHandler);

export default pdfDocumentsRoutes;
