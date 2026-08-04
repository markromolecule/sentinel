import { EvidenceReadinessService } from '../modules/telemetry/evidence/services/evidence-readiness.service';

async function main() {
    try {
        const result = await EvidenceReadinessService.check();

        console.log('Telemetry evidence readiness report');
        console.log(`ready: ${result.ready ? 'yes' : 'no'}`);
        console.log(`evidenceEnabled: ${result.evidenceEnabled ? 'yes' : 'no'}`);
        console.log(`allowlistCount: ${result.institutionAllowlist.length}`);
        console.log(`bucketName: ${result.bucketName}`);
        console.log(`apiSupabaseUrl: ${result.apiSupabaseUrl ?? 'missing'}`);
        console.log(`webSupabaseUrl: ${result.webSupabaseUrl ?? 'missing'}`);

        if (result.bucketReadiness) {
            console.log(
                `bucketReadiness: ${result.bucketReadiness.ready ? 'ready' : 'not-ready'}`,
            );
            console.log(`bucketExists: ${result.bucketReadiness.exists ? 'yes' : 'no'}`);
        } else {
            console.log('bucketReadiness: skipped');
        }

        if (result.issues.length > 0) {
            console.log('issues:');
            for (const issue of result.issues) {
                console.log(`- ${issue.code}: ${issue.message}`);
            }
        }

        process.exitCode = result.ready ? 0 : 1;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Telemetry evidence readiness check failed: ${message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) {
    void main();
}
