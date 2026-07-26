import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { deleteOverrideQuerySchema } from '../../pdf-documents.dto';
import { PdfTemplateService } from '../../pdf-template.service';
import { LogsService } from '../../../logs/logs.service';
import { HTTPException } from 'hono/http-exception';
import { z } from '@hono/zod-openapi';
import {
    assertOverallReportTemplateScope,
    canAccessPdfInstitutionScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';

export const deleteTemplateOverrideRoute = createRoute({
    method: 'delete',
    path: '/templates/override',
    tags: ['PDF Documents'],
    summary: 'Delete Draft PDF Template Override',
    description:
        'Deletes the DRAFT template override for an institution, reverting configuration back to active versions. Requires support role.',
    request: {
        query: deleteOverrideQuerySchema,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: z.object({
                        message: z.string(),
                    }),
                },
            },
            description: 'Draft override deleted successfully',
        },
        400: { description: 'Bad Request' },
        403: { description: 'Forbidden' },
        500: { description: 'Internal Server Error' },
    },
});

export const deleteTemplateOverrideHandler: AppRouteHandler<
    typeof deleteTemplateOverrideRoute
> = async (c) => {
    const user = c.get('user');
    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: 'pdf_templates:manage',
        missingPermissionMessage: 'Forbidden. Missing pdf_templates:manage permission.',
    });

    const { institutionId, documentKind } = c.req.valid('query');
    const dbClient = c.get('dbClient');
    const userInstitutionId = c.get('institutionId');

    if (documentKind === 'ANALYTICS_OVERALL') {
        await assertOverallReportTemplateScope(dbClient, institutionId);
    } else {
        const inst = await dbClient
            .selectFrom('institutions')
            .select(['id'])
            .where('id', '=', institutionId)
            .executeTakeFirst();
        if (!inst) {
            throw new HTTPException(400, {
                message: `Institution ${institutionId} does not exist.`,
            });
        }

        if (!(await canAccessPdfInstitutionScope(dbClient, userInstitutionId, institutionId))) {
            throw new HTTPException(403, {
                message: "Forbidden. You cannot reset another institution's answer key template.",
            });
        }
    }

    const deleted = await PdfTemplateService.deleteDraftOverride(
        dbClient,
        institutionId,
        documentKind,
    );

    await LogsService.createLog(dbClient, {
        userId: user.id,
        action: 'delete_pdf_template_override',
        resourceType: 'pdf_template',
        resourceId: institutionId,
        details: {
            document_kind: documentKind,
            was_deleted: deleted,
        },
        activeInstitutionId: institutionId,
    });

    return c.json(
        {
            message: deleted
                ? 'Draft override deleted successfully'
                : 'No draft override found for this institution and document kind',
        },
        200,
    );
};
