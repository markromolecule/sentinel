import { dbClient, prisma } from '@sentinel/db';
import { PdfCleanupService } from './modules/general/pdf-documents/services/pdf-cleanup.service';

async function main() {
    const summary = await PdfCleanupService.purgeExpiredPdfArtifacts(dbClient);
    const hasErrors = Boolean(summary.analytics.error || summary.examReports.error);

    console.log(
        JSON.stringify(
            {
                analytics: {
                    purgedCount: summary.analytics.purgedCount,
                    error: summary.analytics.error,
                },
                examReports: {
                    purgedCount: summary.examReports.purgedCount,
                    error: summary.examReports.error,
                },
            },
            null,
            2,
        ),
    );

    if (hasErrors) {
        process.exitCode = 1;
    }
}

main()
    .catch((error: unknown) => {
        const message =
            error instanceof Error && error.message.trim().length > 0
                ? error.message
                : 'Unknown PDF cleanup failure.';
        console.error(`PDF cleanup failed: ${message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
