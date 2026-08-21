import { type DbClient } from '@sentinel/db';
import { getEnrolledSubjectsData } from '../data/get-enrolled-subjects';
import { paginateItems } from '../../../../lib/pagination';

export type GetEnrolledSubjectsServiceArgs = {
    dbClient: DbClient;
    userId: string;
    search?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
};

/**
 * Returns all subjects a user (instructor) is enrolled in with optional SQL-level pagination.
 *
 * @param args.dbClient - Database client
 * @param args.userId - User ID to look up
 * @param args.search - Optional search string
 * @param args.page - Optional page index
 * @param args.pageSize - Optional page size
 * @param args.limit - Optional limit alias for page size
 */
export async function getEnrolledSubjectsService({
    dbClient,
    userId,
    search,
    page,
    pageSize,
    limit,
}: GetEnrolledSubjectsServiceArgs) {
    return await getEnrolledSubjectsData({
        dbClient,
        userId,
        search,
        page,
        pageSize: pageSize ?? limit,
    });
}

export type GetEnrolledSubjectsServiceResponse = Awaited<
    ReturnType<typeof getEnrolledSubjectsService>
>;
