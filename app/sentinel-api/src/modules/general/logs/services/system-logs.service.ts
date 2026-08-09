import { type DbClient } from '@sentinel/db';
import { createLogData } from '../data/create-log';
import { getLogsData } from '../data/get-logs';
import type { LogQuery } from '../logs.dto';

export class SystemLogsService {
    /**
     * Captures a system operational diagnostic, job completion, or module exception.
     *
     * @param dbClient database client
     * @param args log actions and details
     */
    static async logSystemEvent(
        dbClient: DbClient,
        args: {
            action: string;
            details?: any;
            institutionId?: string | null;
            branchId?: string | null;
        },
    ) {
        return await createLogData({
            dbClient,
            values: {
                action: args.action,
                resource_type: 'system',
                resource_id: 'system',
                details: args.details,
                institution_id: args.institutionId,
                branch_id: args.branchId,
            },
        });
    }

    /**
     * Fetches paginated backend system error and integration logs.
     *
     * @param dbClient database client
     * @param scopingInstitutionId parent institution boundary ID
     * @param scopingBranchId child branch context boundary ID
     * @param filters request pagination query parameters
     */
    static async getSystemLogs(
        dbClient: DbClient,
        scopingInstitutionId: string | undefined,
        scopingBranchId: string | null | undefined,
        filters: LogQuery,
    ) {
        const systemFilters: LogQuery = {
            ...filters,
            resourceType: 'system',
        };

        const dbResult = await getLogsData({
            dbClient,
            scopingInstitutionId,
            scopingBranchId,
            filters: systemFilters,
        });

        const page = filters.page ?? 1;
        const pageSize = filters.pageSize ?? 20;

        // Fetch and merge GitHub Actions workflow runs only on the first page
        if (page === 1) {
            try {
                const repo = process.env.GITHUB_REPOSITORY || 'markromolecule/sentinel-platform';
                const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
                const headers: Record<string, string> = {
                    'User-Agent': 'sentinel-api',
                    Accept: 'application/vnd.github.v3+json',
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const response = await fetch(
                    `https://api.github.com/repos/${repo}/actions/workflows/telemetry-flush.yml/runs?per_page=30`,
                    { headers },
                );

                if (response.ok) {
                    const data = (await response.json()) as any;
                    const runs = data.workflow_runs || [];

                    let githubLogs = runs.map((run: any) => {
                        let action = 'telemetry.flush_pending';
                        if (run.status === 'completed') {
                            action =
                                run.conclusion === 'success'
                                    ? 'telemetry.flush_success'
                                    : 'telemetry.flush_failure';
                        }

                        let durationStr = '—';
                        if (run.created_at && run.updated_at) {
                            const start = new Date(run.created_at).getTime();
                            const end = new Date(run.updated_at).getTime();
                            const diffSec = Math.round((end - start) / 1000);
                            durationStr = `${diffSec}s`;
                        }

                        return {
                            logId: `github-run-${run.id}`,
                            userId: null,
                            action,
                            resourceType: 'system',
                            resourceId: 'system',
                            details: {
                                stats: {
                                    status: run.status,
                                    conclusion: run.conclusion,
                                    run_number: run.run_number,
                                    duration: durationStr,
                                    commit: run.head_commit?.message?.trim() || '—',
                                    author: run.head_commit?.author?.name || '—',
                                    url: run.html_url,
                                },
                            },
                            ipAddress: null,
                            createdAt: run.created_at,
                            institutionId: null,
                            branchId: null,
                            userFirstName: null,
                            userLastName: null,
                        };
                    });

                    // Filter githubLogs by action if specified
                    if (filters.action) {
                        githubLogs = githubLogs.filter((log: any) => log.action === filters.action);
                    }

                    // Filter by date range if specified
                    if (filters.startDate) {
                        const start = new Date(filters.startDate).getTime();
                        githubLogs = githubLogs.filter(
                            (log: any) => new Date(log.createdAt).getTime() >= start,
                        );
                    }
                    if (filters.endDate) {
                        const end = new Date(filters.endDate).getTime();
                        githubLogs = githubLogs.filter(
                            (log: any) => new Date(log.createdAt).getTime() <= end,
                        );
                    }

                    // Merge and sort combined list by createdAt desc
                    const combinedItems = [...dbResult.items, ...githubLogs].sort(
                        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    );

                    const paginatedItems = combinedItems.slice(0, pageSize);
                    const totalCombined = dbResult.total + githubLogs.length;

                    return {
                        items: paginatedItems,
                        page,
                        pageSize,
                        total: totalCombined,
                        totalPages: Math.ceil(totalCombined / pageSize),
                        hasMore: dbResult.hasMore || githubLogs.length > pageSize,
                    };
                }
            } catch (error) {
                console.error(
                    '[SystemLogsService] Failed to fetch or merge GitHub Action runs:',
                    error,
                );
            }
        }

        return dbResult;
    }
}
