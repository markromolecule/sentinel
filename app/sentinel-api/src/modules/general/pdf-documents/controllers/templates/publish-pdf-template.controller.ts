import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { PdfTemplateService } from '../../pdf-template.service';
import { LogsService } from '../../../logs/logs.service';
import { HTTPException } from 'hono/http-exception';
import { z } from '@hono/zod-openapi';
import {
    assertOverallReportTemplateScope,
    canAccessPdfInstitutionScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';

export const publishTemplateRoute = createRoute({
    method: 'post',
    path: '/templates/{templateId}/publish',
    tags: ['PDF Documents'],
    summary: 'Publish PDF Template',
    description:
        'Promotes a draft PDF template to published status and archives the active version. Requires support role.',
    request: {
        params: z.object({
            templateId: z.string().uuid(),
        }),
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: z.object({
                        message: z.string(),
                        template_id: z.string().uuid(),
                        version: z.number().int().positive(),
                    }),
                },
            },
            description: 'Template published successfully',
        },
        400: { description: 'Bad Request' },
        403: { description: 'Forbidden' },
        500: { description: 'Internal Server Error' },
    },
});

export const publishTemplateHandler: AppRouteHandler<typeof publishTemplateRoute> = async (c) => {
    const user = c.get('user');
    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: 'pdf_templates:manage',
        missingPermissionMessage: 'Forbidden. Missing pdf_templates:manage permission.',
    });

    const { templateId } = c.req.valid('param');
    const dbClient = c.get('dbClient');
    const userInstitutionId = c.get('institutionId');

    const template = await dbClient
        .selectFrom('pdf_templates')
        .select(['institution_id', 'document_kind', 'status'])
        .where('template_id', '=', templateId)
        .executeTakeFirst();

    if (!template) {
        throw new HTTPException(404, { message: 'Template not found.' });
    }

    if (template.status !== 'DRAFT') {
        throw new HTTPException(400, {
            message: `Template is not in DRAFT status (current status: ${template.status}).`,
        });
    }

    if (template.document_kind === 'ANALYTICS_OVERALL') {
        await assertOverallReportTemplateScope(dbClient, template.institution_id);
    } else if (
        !(await canAccessPdfInstitutionScope(dbClient, userInstitutionId, template.institution_id))
    ) {
        throw new HTTPException(403, {
            message: "Forbidden. You cannot publish another institution's answer key template.",
        });
    }

    const result = await PdfTemplateService.publishTemplate(dbClient, templateId, user.id);

    await LogsService.createLog(dbClient, {
        userId: user.id,
        action: 'publish_pdf_template',
        resourceType: 'pdf_template',
        resourceId: templateId,
        details: {
            version: result.version,
            document_kind: template?.document_kind,
        },
        activeInstitutionId: template?.institution_id ?? '00000000-0000-0000-0000-000000000000',
    });

    return c.json(
        {
            message: 'Template published successfully',
            template_id: result.templateId,
            version: result.version,
        },
        200,
    );
};
