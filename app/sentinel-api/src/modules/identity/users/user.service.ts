import { type DbClient } from '@sentinel/db';
import { type CreateUserBody, type UpdateUserBody } from './user.dto';
import { prepareUserForAuthDeletion } from './data/delete-user';
import { UserAuthService } from './services/user-auth.service';
import { UserInviteService } from './services/user-invite.service';
import { UserCrudService } from './services/user-crud.service';
import { HTTPException } from 'hono/http-exception';

export class UserService {
    // Get all users
    static async getUsers(
        dbClient: DbClient,
        institutionId: string | undefined,
        search?: string,
        limit?: number,
        offset?: number,
        requesterUserId?: string,
        requesterRole?: string,
        requesterDepartmentId?: string | null,
        requesterCourseId?: string | null,
        roleFilter?: string,
        roleFilters?: string[],
        includeInstitutionUsers?: boolean,
    ) {
        return await UserCrudService.getUsers(
            dbClient,
            institutionId,
            search,
            limit,
            offset,
            requesterUserId,
            requesterRole,
            requesterDepartmentId,
            requesterCourseId,
            roleFilter,
            roleFilters,
            includeInstitutionUsers,
        );
    }

    static async getInstructorDashboard(
        dbClient: DbClient,
        requesterUserId: string,
        institutionId?: string,
    ) {
        return await UserCrudService.getInstructorDashboard(
            dbClient,
            requesterUserId,
            institutionId,
        );
    }

    static async getInstructorStudentEnrollments(
        dbClient: DbClient,
        institutionId: string | undefined,
        requesterUserId: string,
        search?: string,
    ) {
        return await UserCrudService.getInstructorStudentEnrollments(
            dbClient,
            institutionId,
            requesterUserId,
            search,
        );
    }

    static async getInstructorStudentEnrollmentDetail(
        dbClient: DbClient,
        institutionId: string | undefined,
        requesterUserId: string,
        targetUserId: string,
    ) {
        return await UserCrudService.getInstructorStudentEnrollmentDetail(
            dbClient,
            institutionId,
            requesterUserId,
            targetUserId,
        );
    }

    static async getStudentEnrollmentDetail(
        dbClient: DbClient,
        institutionId: string | undefined,
        targetUserId: string,
    ) {
        return await UserCrudService.getStudentEnrollmentDetail(
            dbClient,
            institutionId,
            targetUserId,
        );
    }
    // Get single user
    static async getUserById(
        dbClient: DbClient,
        id: string,
        institutionId?: string,
        requesterRole?: string,
        requesterUserId?: string,
        requesterDepartmentId?: string | null,
        requesterCourseId?: string | null,
    ) {
        return await UserCrudService.getUserById(
            dbClient,
            id,
            institutionId,
            requesterRole,
            requesterUserId,
            requesterDepartmentId,
            requesterCourseId,
        );
    }

    // Create user
    static async createUser(dbClient: DbClient, values: CreateUserBody) {
        // 1. Let Supabase create the Auth User and generate the ID
        const { id: userId } = await UserAuthService.createUserAuth(dbClient, values);

        // 2. Synchronize with Database Profile and Students
        try {
            return await UserCrudService.createUser(dbClient, userId, values);
        } catch (error) {
            // Rollback Auth user if DB sync fails
            await UserAuthService.deleteUserAuth(dbClient, userId);
            throw error;
        }
    }

    // Update user
    static async updateUser(
        dbClient: DbClient,
        id: string,
        values: UpdateUserBody,
        requesterRole?: string,
        institutionId?: string,
        requesterUserId?: string,
        requesterDepartmentId?: string | null,
        requesterCourseId?: string | null,
    ) {
        await UserCrudService.getUserById(
            dbClient,
            id,
            institutionId,
            requesterRole,
            requesterUserId,
            requesterDepartmentId,
            requesterCourseId,
        );

        // 1. Update Auth record if email/role changed
        await UserAuthService.updateUserAuth(dbClient, id, values);

        // 2. Update DB Profile and Students record
        return await UserCrudService.updateUser(dbClient, id, values, requesterRole);
    }

    // Delete user
    static async deleteUser(
        dbClient: DbClient,
        id: string,
        requesterRole?: string,
        institutionId?: string,
        requesterUserId?: string,
        requesterDepartmentId?: string | null,
        requesterCourseId?: string | null,
    ) {
        if (id === requesterUserId) {
            throw new HTTPException(400, { message: 'Cannot delete your own user account' });
        }

        await UserCrudService.getUserById(
            dbClient,
            id,
            institutionId,
            requesterRole,
            requesterUserId,
            requesterDepartmentId,
            requesterCourseId,
        );

        // 1. Clear nullable references that would otherwise block auth.users deletion.
        await prepareUserForAuthDeletion({
            dbClient,
            id,
            requesterRole,
            requesterUserId,
        });

        // 2. Delete Auth record using Supabase Admin
        await UserAuthService.deleteUserAuth(dbClient, id);

        // 3. Cleanup remaining DB records after auth deletion succeeds.
        return await UserCrudService.deleteUser(dbClient, id, requesterRole, requesterUserId);
    }

    // Invite user
    static async inviteUser(dbClient: DbClient, values: CreateUserBody, requestOrigin?: string) {
        // 1. Send invite via Supabase Auth Admin
        const authCtx = await UserInviteService.inviteUserAuth(values, requestOrigin);

        // 2. Synchronize with Database Profile and Students/Instructors
        try {
            const user = await UserCrudService.createUser(dbClient, authCtx.id, values);

            return {
                user,
                inviteDelivery: authCtx.inviteDelivery,
                inviteLink: authCtx.inviteLink,
            };
        } catch (error) {
            // Rollback Auth user if DB sync fails
            await UserAuthService.deleteUserAuth(dbClient, authCtx.id);
            throw error;
        }
    }

    // Delete multiple users
    static async deleteUsers(
        dbClient: DbClient,
        ids: string[],
        requesterRole?: string,
        institutionId?: string,
        requesterUserId?: string,
        requesterDepartmentId?: string | null,
        requesterCourseId?: string | null,
    ) {
        // Prevent deleting oneself
        const filteredIds = ids.filter((id) => id !== requesterUserId);
        if (filteredIds.length === 0) {
            throw new Error('Cannot delete your own user account');
        }

        for (const id of filteredIds) {
            await this.deleteUser(
                dbClient,
                id,
                requesterRole,
                institutionId,
                requesterUserId,
                requesterDepartmentId,
                requesterCourseId,
            );
        }
    }
}
