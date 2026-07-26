import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { institutionPdfBrandingSchema } from '../../pdf-documents.dto';
import { InstitutionBrandingService } from '../../services/institution-branding.service';
import { HTTPException } from 'hono/http-exception';
import { z } from '@hono/zod-openapi';
import {
    assertOverallReportTemplateScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';

export const getBrandingRoute = createRoute({
    method: 'get',
    path: '/institutions/{institutionId}/branding',
    tags: ['PDF Documents'],
    summary: 'Get Institution PDF Branding',
    description:
        'Retrieves the PDF branding configuration (such as the custom logo path) for a specific institution. Requires support role.',
    request: {
        params: z.object({
            institutionId: z.string().uuid(),
        }),
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: z.object({
                        message: z.string(),
                        data: institutionPdfBrandingSchema,
                    }),
                },
            },
            description: 'Branding config retrieved successfully',
        },
        400: { description: 'Bad Request' },
        403: { description: 'Forbidden' },
        404: { description: 'Branding configuration not found' },
        500: { description: 'Internal Server Error' },
    },
});

export const getBrandingHandler: AppRouteHandler<typeof getBrandingRoute> = async (c) => {
    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: [
            'institution_branding:manage',
            'pdf_templates:view',
            'pdf_templates:manage',
        ],
        missingPermissionMessage: 'Forbidden. Missing branding access permission.',
    });

    const { institutionId } = c.req.valid('param');
    const dbClient = c.get('dbClient');
    await assertOverallReportTemplateScope(dbClient, institutionId);

    const branding = await InstitutionBrandingService.getBranding(dbClient, institutionId);
    if (!branding) {
        throw new HTTPException(404, { message: 'Branding configuration not found' });
    }

    return c.json(
        {
            message: 'Branding config retrieved successfully',
            data: {
                institution_id: branding.institution_id,
                logo_storage_bucket: branding.logo_storage_bucket,
                logo_storage_path: branding.logo_storage_path,
                logo_mime_type: branding.logo_mime_type,
                logo_size_bytes: branding.logo_size_bytes,
                logo_hash_sha256: branding.logo_hash_sha256,
                logo_original_name: branding.logo_original_name,
                updated_by: branding.updated_by,
                created_at: branding.created_at.toISOString(),
                updated_at: branding.updated_at.toISOString(),
            },
        },
        200,
    );
};
