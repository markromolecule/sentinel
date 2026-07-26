import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { getPdfTemplatesQuerySchema, pdfTemplateSchema } from '../../pdf-documents.dto';
import { PdfTemplateService } from '../../pdf-template.service';
import { HTTPException } from 'hono/http-exception';
import { z } from '@hono/zod-openapi';
import {
    assertOverallReportTemplateScope,
    canAccessPdfInstitutionScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';

export const getPdfTemplatesRoute = createRoute({
    method: 'get',
    path: '/templates',
    tags: ['PDF Documents'],
    summary: 'List PDF Templates',
    description:
        'Retrieves all global and/or institution-specific templates based on query filters. Requires support role.',
    request: {
        query: getPdfTemplatesQuerySchema,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: z.object({
                        message: z.string(),
                        data: z.array(pdfTemplateSchema),
                    }),
                },
            },
            description: 'Templates retrieved successfully',
        },
        400: { description: 'Bad Request' },
        403: { description: 'Forbidden' },
        500: { description: 'Internal Server Error' },
    },
});

export const getPdfTemplatesHandler: AppRouteHandler<typeof getPdfTemplatesRoute> = async (c) => {
    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: ['pdf_templates:view', 'pdf_templates:manage'],
        missingPermissionMessage: 'Forbidden. Missing PDF template access permission.',
    });

    const { institutionId, documentKind, status } = c.req.valid('query');
    const dbClient = c.get('dbClient');
    const userInstitutionId = c.get('institutionId');

    if (documentKind === 'ANALYTICS_OVERALL') {
        await assertOverallReportTemplateScope(dbClient, institutionId);
    } else if (institutionId) {
        const institution = await dbClient
            .selectFrom('institutions')
            .select(['id'])
            .where('id', '=', institutionId)
            .executeTakeFirst();
        if (!institution) {
            throw new HTTPException(400, {
                message: `Institution ${institutionId} does not exist.`,
            });
        }

        if (!(await canAccessPdfInstitutionScope(dbClient, userInstitutionId, institutionId))) {
            throw new HTTPException(403, {
                message: "Forbidden. You cannot access another institution's answer key template.",
            });
        }
    }

    const templates = await PdfTemplateService.getTemplates(dbClient, {
        institutionId,
        documentKind,
        status,
    });

    const formatted = templates.map((t) => ({
        template_id: t.template_id,
        institution_id: t.institution_id,
        document_kind: t.document_kind,
        version: t.version,
        status: t.status,
        header_config:
            typeof t.header_config === 'string' ? JSON.parse(t.header_config) : t.header_config,
        footer_config:
            typeof t.footer_config === 'string' ? JSON.parse(t.footer_config) : t.footer_config,
        created_by: t.created_by,
        updated_by: t.updated_by,
        published_by: t.published_by,
        created_at: t.created_at.toISOString(),
        updated_at: t.updated_at.toISOString(),
        published_at: t.published_at ? t.published_at.toISOString() : null,
    }));

    return c.json(
        {
            message: 'Templates retrieved successfully',
            data: formatted,
        },
        200,
    );
};
