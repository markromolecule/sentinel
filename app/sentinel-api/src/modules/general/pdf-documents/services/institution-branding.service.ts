import { type DbClient, executeTransaction } from '@sentinel/db';
import { PdfStorageService, UploadedLogoMetadata } from '../storage/pdf-storage.service';

export class InstitutionBrandingService {
    /**
     * Gets the branding configuration for an institution.
     *
     * @param dbClient database client
     * @param institutionId institution ID
     * @returns branding record or null
     */
    static async getBranding(dbClient: DbClient, institutionId: string) {
        return await dbClient
            .selectFrom('institution_pdf_branding')
            .selectAll()
            .where('institution_id', '=', institutionId)
            .executeTakeFirst();
    }

    /**
     * Upserts the branding configuration for an institution, returning the old logo path if replaced.
     *
     * @param dbClient database client
     * @param institutionId institution ID
     * @param logo logo upload metadata
     * @param userId updating user ID
     * @returns old logo details to delete, if any
     */
    static async upsertBranding(
        dbClient: DbClient,
        institutionId: string,
        logo: UploadedLogoMetadata,
        userId: string,
    ) {
        return await executeTransaction(async (trx) => {
            const oldBranding = await trx
                .selectFrom('institution_pdf_branding')
                .select(['logo_storage_bucket', 'logo_storage_path'])
                .where('institution_id', '=', institutionId)
                .executeTakeFirst();

            const now = new Date();

            if (oldBranding) {
                await trx
                    .updateTable('institution_pdf_branding')
                    .set({
                        logo_storage_bucket: logo.bucket,
                        logo_storage_path: logo.path,
                        logo_mime_type: logo.mimeType,
                        logo_size_bytes: logo.sizeBytes,
                        logo_hash_sha256: logo.hashSha256,
                        logo_original_name: logo.originalName,
                        updated_by: userId,
                        updated_at: now,
                    })
                    .where('institution_id', '=', institutionId)
                    .execute();
            } else {
                await trx
                    .insertInto('institution_pdf_branding')
                    .values({
                        institution_id: institutionId,
                        logo_storage_bucket: logo.bucket,
                        logo_storage_path: logo.path,
                        logo_mime_type: logo.mimeType,
                        logo_size_bytes: logo.sizeBytes,
                        logo_hash_sha256: logo.hashSha256,
                        logo_original_name: logo.originalName,
                        updated_by: userId,
                        created_at: now,
                        updated_at: now,
                    })
                    .execute();
            }

            return oldBranding;
        });
    }

    /**
     * Downloads the branding logo buffer from private storage.
     *
     * @param bucket storage bucket name
     * @param path storage file path
     * @returns logo file as a Buffer
     */
    static async downloadBrandingLogo(bucket: string, path: string): Promise<Buffer> {
        return PdfStorageService.downloadPdf(bucket, path);
    }

    /**
     * Deletes the branding configuration for an institution.
     *
     * @param dbClient database client
     * @param institutionId institution ID
     * @returns old logo details to delete
     */
    static async deleteBranding(dbClient: DbClient, institutionId: string) {
        return await executeTransaction(async (trx) => {
            const oldBranding = await trx
                .selectFrom('institution_pdf_branding')
                .select(['logo_storage_bucket', 'logo_storage_path'])
                .where('institution_id', '=', institutionId)
                .executeTakeFirst();

            if (!oldBranding) {
                throw new Error('Branding configuration not found');
            }

            await trx
                .deleteFrom('institution_pdf_branding')
                .where('institution_id', '=', institutionId)
                .execute();

            return oldBranding;
        });
    }
}
