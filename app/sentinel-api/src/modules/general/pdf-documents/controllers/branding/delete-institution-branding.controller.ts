import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { InstitutionBrandingService } from '../../services/institution-branding.service';
import { PdfStorageService } from '../../storage/pdf-storage.service';
import { LogsService } from '../../../logs/logs.service';
import { HTTPException } from 'hono/http-exception';
import { z } from '@hono/zod-openapi';
import {
    assertOverallReportTemplateScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';

export const deleteBrandingRoute = createRoute({
    method: 'delete',
    path: '/institutions/{institutionId}/branding',
    tags: ['PDF Documents'],
    summary: 'Delete Institution PDF Branding Logo',
    description:
        'Deletes the PDF branding logo and resets configuration for a specific institution. Requires support role.',
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
                    }),
                },
            },
            description: 'Branding config deleted successfully',
        },
        400: { description: 'Bad Request' },
        403: { description: 'Forbidden' },
        404: { description: 'Branding configuration not found' },
        500: { description: 'Internal Server Error' },
    },
});

export const deleteBrandingHandler: AppRouteHandler<typeof deleteBrandingRoute> = async (c) => {
    const user = c.get('user');
    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: 'institution_branding:manage',
        missingPermissionMessage: 'Forbidden. Missing institution_branding:manage permission.',
    });

    const { institutionId } = c.req.valid('param');
    const dbClient = c.get('dbClient');
    await assertOverallReportTemplateScope(dbClient, institutionId);

    let oldBranding;
    try {
        oldBranding = await InstitutionBrandingService.deleteBranding(dbClient, institutionId);
    } catch (err: any) {
        throw new HTTPException(404, { message: err.message });
    }

    // Delete logo from private storage
    try {
        await PdfStorageService.deleteBrandingLogo(
            oldBranding.logo_storage_bucket,
            oldBranding.logo_storage_path,
        );
    } catch (err: any) {
        console.error('Failed to clean up branding logo from storage:', err);
    }

    await LogsService.createLog(dbClient, {
        userId: user.id,
        action: 'delete_institution_branding',
        resourceType: 'institution_branding',
        resourceId: institutionId,
        details: {
            logo_path: oldBranding.logo_storage_path,
        },
        activeInstitutionId: institutionId,
    });

    return c.json(
        {
            message: 'Branding logo deleted successfully',
        },
        200,
    );
};
