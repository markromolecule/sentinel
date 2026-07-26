import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { institutionPdfBrandingSchema } from '../../pdf-documents.dto';
import { InstitutionBrandingService } from '../../services/institution-branding.service';
import { PdfStorageService } from '../../storage/pdf-storage.service';
import { LogsService } from '../../../logs/logs.service';
import { HTTPException } from 'hono/http-exception';
import { z } from '@hono/zod-openapi';
import {
    assertOverallReportTemplateScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';

export const uploadBrandingRoute = createRoute({
    method: 'post',
    path: '/institutions/{institutionId}/branding',
    tags: ['PDF Documents'],
    summary: 'Upload Institution PDF Branding Logo',
    description:
        'Uploads and replaces a custom PDF branding logo for an institution. Requires support role.',
    request: {
        params: z.object({
            institutionId: z.string().uuid(),
        }),
        body: {
            content: {
                'multipart/form-data': {
                    schema: z.object({
                        logo: z.any().openapi({
                            type: 'string',
                            format: 'binary',
                        }),
                    }),
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
                        data: institutionPdfBrandingSchema,
                    }),
                },
            },
            description: 'Branding logo uploaded successfully',
        },
        400: { description: 'Bad Request' },
        403: { description: 'Forbidden' },
        500: { description: 'Internal Server Error' },
    },
});

export const uploadBrandingHandler: AppRouteHandler<typeof uploadBrandingRoute> = async (c) => {
    const user = c.get('user');
    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: 'institution_branding:manage',
        missingPermissionMessage: 'Forbidden. Missing institution_branding:manage permission.',
    });

    const { institutionId } = c.req.valid('param');
    const dbClient = c.get('dbClient');
    await assertOverallReportTemplateScope(dbClient, institutionId);

    const multipartBody = (await c.req.parseBody({
        all: true,
    })) as Record<string, string | File | (string | File)[]>;

    const file = multipartBody.logo;

    if (!file || typeof file === 'string' || Array.isArray(file)) {
        throw new HTTPException(400, { message: 'A single logo file is required.' });
    }

    let uploadMeta;
    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        uploadMeta = await PdfStorageService.uploadBrandingLogo(
            institutionId,
            buffer,
            file.type,
            file.name,
        );
    } catch (err: any) {
        throw new HTTPException(400, { message: err.message });
    }

    const oldBranding = await InstitutionBrandingService.upsertBranding(
        dbClient,
        institutionId,
        uploadMeta,
        user.id,
    );

    if (oldBranding) {
        try {
            await PdfStorageService.deleteBrandingLogo(
                oldBranding.logo_storage_bucket,
                oldBranding.logo_storage_path,
            );
        } catch (err: any) {
            console.error('Failed to clean up old branding logo from storage:', err);
        }
    }

    const updated = await InstitutionBrandingService.getBranding(dbClient, institutionId);
    if (!updated) {
        throw new HTTPException(500, {
            message: 'Failed to retrieve updated branding configuration.',
        });
    }

    await LogsService.createLog(dbClient, {
        userId: user.id,
        action: 'upload_institution_branding',
        resourceType: 'institution_branding',
        resourceId: institutionId,
        details: {
            logo_mime_type: uploadMeta.mimeType,
            logo_size_bytes: uploadMeta.sizeBytes,
        },
        activeInstitutionId: institutionId,
    });

    return c.json(
        {
            message: 'Branding logo uploaded successfully',
            data: {
                institution_id: updated.institution_id,
                logo_storage_bucket: updated.logo_storage_bucket,
                logo_storage_path: updated.logo_storage_path,
                logo_mime_type: updated.logo_mime_type,
                logo_size_bytes: updated.logo_size_bytes,
                logo_hash_sha256: updated.logo_hash_sha256,
                logo_original_name: updated.logo_original_name,
                updated_by: updated.updated_by,
                created_at: updated.created_at.toISOString(),
                updated_at: updated.updated_at.toISOString(),
            },
        },
        200,
    );
};
