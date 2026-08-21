import { type DbClient } from '@sentinel/db';
import { getEnrollmentRequestsData } from '../data/get-enrollment-requests';
import { paginateItems } from '../../../../lib/pagination';

export type GetEnrollmentRequestsServiceArgs = {
    dbClient: DbClient;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    userId?: string;
    institutionId?: string;
    departmentId?: string;
    courseId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
};

/**
 * Returns enrolment requests, optionally filtered by status, user, institution,
 * department, course, or search string, with optional SQL-level pagination.
 *
 * @param args - Filter and pagination arguments forwarded directly to the data layer
 */
export async function getEnrollmentRequestsService({
    dbClient,
    page,
    pageSize,
    limit,
    ...filters
}: GetEnrollmentRequestsServiceArgs) {
    return await getEnrollmentRequestsData({
        dbClient,
        page,
        pageSize: pageSize ?? limit,
        ...filters,
    });
}

export type GetEnrollmentRequestsServiceResponse = Awaited<
    ReturnType<typeof getEnrollmentRequestsService>
>;
