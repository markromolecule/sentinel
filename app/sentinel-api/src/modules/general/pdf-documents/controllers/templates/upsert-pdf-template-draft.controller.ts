import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { upsertPdfTemplateDraftBodySchema } from '../../pdf-documents.dto';
import { PdfTemplateService } from '../../pdf-template.service';
import { LogsService } from '../../../logs/logs.service';
import { HTTPException } from 'hono/http-exception';
import { z } from '@hono/zod-openapi';
import {
    assertOverallReportTemplateScope,
    canAccessPdfInstitutionScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';

export const upsertTemplateDraftRoute = createRoute({
    method: 'put',
    path: '/templates/draft',
    tags: ['PDF Documents'],
    summary: 'Upsert PDF Template Draft',
    description:
        'Creates or updates a draft PDF template override for an institution or globally. Requires support role.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: upsertPdfTemplateDraftBodySchema,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: z.object({
                        message: z.string(),
                        template_id: z.string().uuid(),
                    }),
                },
            },
            description: 'Draft template upserted successfully',
        },
        400: { description: 'Bad Request' },
        403: { description: 'Forbidden' },
        500: { description: 'Internal Server Error' },
    },
});

export const upsertTemplateDraftHandler: AppRouteHandler<typeof upsertTemplateDraftRoute> = async (
    c,
) => {
    const user = c.get('user');
    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: 'pdf_templates:manage',
        missingPermissionMessage: 'Forbidden. Missing pdf_templates:manage permission.',
    });

    const { institution_id, document_kind, header_config, footer_config } = c.req.valid('json');
    const dbClient = c.get('dbClient');
    const userInstitutionId = c.get('institutionId');

    // Custom constraint: Sentinel logo must be visible on overall analytics reports
    if (document_kind === 'ANALYTICS_OVERALL') {
        if (header_config.sentinel_logo_visible !== true) {
            throw new HTTPException(400, {
                message: 'Sentinel logo visibility must be true for analytics overall reports',
            });
        }

        await assertOverallReportTemplateScope(dbClient, institution_id);
    }

    // Verify institution exists if provided
    if (institution_id && document_kind !== 'ANALYTICS_OVERALL') {
        const inst = await dbClient
            .selectFrom('institutions')
            .select(['id'])
            .where('id', '=', institution_id)
            .executeTakeFirst();
        if (!inst) {
            throw new HTTPException(400, {
                message: `Institution ${institution_id} does not exist.`,
            });
        }

        if (!(await canAccessPdfInstitutionScope(dbClient, userInstitutionId, institution_id))) {
            throw new HTTPException(403, {
                message: "Forbidden. You cannot manage another institution's answer key template.",
            });
        }
    }

    const templateId = await PdfTemplateService.upsertDraft(dbClient, {
        institutionId: institution_id ?? null,
        documentKind: document_kind,
        headerConfig: header_config,
        footerConfig: footer_config,
        userId: user.id,
    });

    // Create activity log
    await LogsService.createLog(dbClient, {
        userId: user.id,
        action: 'upsert_pdf_template_draft',
        resourceType: 'pdf_template',
        resourceId: templateId,
        details: {
            document_kind,
            institution_id: institution_id ?? null,
        },
        activeInstitutionId: institution_id ?? '00000000-0000-0000-0000-000000000000',
    });

    return c.json(
        {
            message: 'Draft template upserted successfully',
            template_id: templateId,
        },
        200,
    );
};
