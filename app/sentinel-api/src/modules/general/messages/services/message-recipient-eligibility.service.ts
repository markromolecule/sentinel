import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import { HTTPException } from 'hono/http-exception';
import { getMessageRecipientsData } from '../data/get-message-recipients';

/**
 * Resolves the primary role of a user.
 *
 * @param dbClient - Kysely database client
 * @param userId - User ID to query
 */
async function getUserPrimaryRole(dbClient: DbClient, userId: string): Promise<string | null> {
    const row = await dbClient
        .selectFrom('user_roles as ur')
        .innerJoin('roles as r', 'r.role_id', 'ur.role_id')
        .select('r.role_name as roleName')
        .where('ur.user_id', '=', userId)
        .orderBy('r.is_system', 'desc')
        .orderBy('r.domain_scope', 'asc')
        .executeTakeFirst();
    return row?.roleName ?? null;
}

export type ListEligibleRecipientsArgs = {
    requesterUserId: string;
    institutionId: string;
    search: string;
    limit: number;
};

/**
 * Lists eligible message recipients for the authenticated requester.
 * If the requester is a student, enforces strict roles, status, and tenant rules.
 *
 * @param dbClient - Kysely database client
 * @param args - Search parameters and requester context
 */
export async function listEligibleMessageRecipients(
    dbClient: DbClient,
    args: ListEligibleRecipientsArgs,
) {
    const requesterRole = await getUserPrimaryRole(dbClient, args.requesterUserId);
    const isRequesterStudent = requesterRole === 'student';

    return await getMessageRecipientsData(dbClient, {
        requesterUserId: args.requesterUserId,
        institutionId: args.institutionId,
        search: args.search,
        limit: args.limit,
        isRequesterStudent,
    });
}

export type AssertEligibleRecipientArgs = {
    requesterUserId: string;
    requesterRole: string | null;
    institutionId: string;
    recipientId: string;
};

/**
 * Asserts that a recipient is eligible to receive a direct message from the requester.
 * Throws a non-leaking 404 HTTPException if the recipient is ineligible or does not exist.
 *
 * @param dbClient - Kysely database client
 * @param args - Requester and recipient contexts
 */
export async function assertEligibleDirectMessageRecipient(
    dbClient: DbClient,
    args: AssertEligibleRecipientArgs,
) {
    // If the requester is not a student, skip eligibility checks
    if (args.requesterRole !== 'student') {
        // Just verify the recipient exists in the system
        const recipientExists = await dbClient
            .selectFrom('user_profiles')
            .select('user_id')
            .where('user_id', '=', args.recipientId)
            .executeTakeFirst();

        if (!recipientExists) {
            throw new HTTPException(404, { message: 'Message recipient not found.' });
        }
        return;
    }

    // Requester is a student: recipient must meet all search eligibility criteria
    // We execute getMessageRecipientsData with a dummy search filter and limit = 1
    // but we inject a check for the specific recipient ID.
    const query = dbClient
        .selectFrom('user_profiles as up')
        .leftJoin('institutions as inst', 'inst.id', 'up.institution_id')
        .select(['up.user_id as userId'])
        .where('up.user_id', '=', args.recipientId)
        .where('up.user_id', '!=', args.requesterUserId)
        .where('up.status', '=', 'ACTIVE')
        .where('up.institution_id', '=', args.institutionId)
        // Primary role is not support or superadmin
        .where(
            sql`coalesce((${dbClient
                .selectFrom('user_roles as ur_sub')
                .innerJoin('roles as r_sub', 'r_sub.role_id', 'ur_sub.role_id')
                .select('r_sub.role_name')
                .whereRef('ur_sub.user_id', '=', 'up.user_id' as any)
                .orderBy('r_sub.is_system', 'desc')
                .orderBy('r_sub.domain_scope', 'asc')
                .limit(1)}), 'student')`,
            'not in',
            ['support', 'superadmin'],
        )
        // Rbac 'messages:view' permission check
        .where((eb) =>
            eb.or([
                eb.exists(
                    eb
                        .selectFrom('rbac_user_permission_overrides as upo_allow')
                        .innerJoin(
                            'rbac_permissions as p_allow',
                            'p_allow.permission_id',
                            'upo_allow.permission_id',
                        )
                        .select('upo_allow.user_id')
                        .whereRef('upo_allow.user_id', '=', 'up.user_id')
                        .where('p_allow.permission_key', '=', 'messages:view')
                        .where('upo_allow.effect', '=', 'allow'),
                ),
                eb.and([
                    eb.exists(
                        eb
                            .selectFrom('user_roles as ur')
                            .innerJoin('rbac_role_permissions as rrp', 'rrp.role_id', 'ur.role_id')
                            .innerJoin(
                                'rbac_permissions as p',
                                'p.permission_id',
                                'rrp.permission_id',
                            )
                            .select('ur.user_id')
                            .whereRef('ur.user_id', '=', 'up.user_id')
                            .where('p.permission_key', '=', 'messages:view'),
                    ),
                    eb.not(
                        eb.exists(
                            eb
                                .selectFrom('rbac_user_permission_overrides as upo_deny')
                                .innerJoin(
                                    'rbac_permissions as p_deny',
                                    'p_deny.permission_id',
                                    'upo_deny.permission_id',
                                )
                                .select('upo_deny.user_id')
                                .whereRef('upo_deny.user_id', '=', 'up.user_id')
                                .where('p_deny.permission_key', '=', 'messages:view')
                                .where('upo_deny.effect', '=', 'deny'),
                        ),
                    ),
                ]),
            ]),
        );

    const eligibleRecipient = await query.executeTakeFirst();

    if (!eligibleRecipient) {
        throw new HTTPException(404, { message: 'Message recipient not found.' });
    }
}
