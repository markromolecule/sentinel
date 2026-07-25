import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';

export type GetMessageRecipientsArgs = {
    requesterUserId: string;
    institutionId: string;
    search: string;
    limit: number;
    isRequesterStudent: boolean;
};

/**
 * Retrieves eligible message recipients for a student user.
 * Messageable recipients must:
 * - Not be the requester
 * - Have ACTIVE status
 * - belong to the requester's exact active institution
 * - Not have a primary role of 'support' or 'superadmin' (if requester is a student)
 * - Retain active 'messages:view' permission
 *
 * @param dbClient - Kysely database client
 * @param args - Arguments containing requester, institution, search term, limit, and role type
 */
export async function getMessageRecipientsData(
    dbClient: DbClient,
    { requesterUserId, institutionId, search, limit, isRequesterStudent }: GetMessageRecipientsArgs,
) {
    let query = dbClient
        .selectFrom('user_profiles as up')
        .leftJoin('institutions as inst', 'inst.id', 'up.institution_id')
        .select((eb) => [
            'up.user_id as userId',
            sql<string>`coalesce(nullif(trim(concat_ws(' ', up.first_name, up.last_name)), ''), 'User')`.as('name'),
            'up.avatar_url as avatarUrl',
            'up.status as status',
            eb
                .selectFrom('user_roles as ur_sub')
                .innerJoin('roles as r_sub', 'r_sub.role_id', 'ur_sub.role_id')
                .select('r_sub.role_name')
                .whereRef('ur_sub.user_id', '=', 'up.user_id')
                .orderBy('r_sub.is_system', 'desc')
                .orderBy('r_sub.domain_scope', 'asc')
                .limit(1)
                .as('role'),
            sql<any>`case
                when inst.id is not null then json_build_object(
                    'id', inst.id,
                    'name', inst.name
                )
                else null
            end`.as('institution'),
        ])
        .where('up.user_id', '!=', requesterUserId)
        .where('up.status', '=', 'ACTIVE')
        .where('up.institution_id', '=', institutionId);

    // Primary role is not support or superadmin (only enforced if requester is a student)
    if (isRequesterStudent) {
        query = query.where(
            sql`coalesce((${dbClient
                .selectFrom('user_roles as ur_sub')
                .innerJoin('roles as r_sub', 'r_sub.role_id', 'ur_sub.role_id')
                .select('r_sub.role_name')
                .whereRef('ur_sub.user_id', '=', 'up.user_id' as any)
                .orderBy('r_sub.is_system', 'desc')
                .orderBy('r_sub.domain_scope', 'asc')
                .limit(1)
            }), 'student')`,
            'not in',
            ['support', 'superadmin'],
        );
    }

    const records = await query
        // Search filter: first name, last name, or combined display name
        .where((eb) =>
            eb.or([
                eb('up.first_name', 'ilike', `%${search}%`),
                eb('up.last_name', 'ilike', `%${search}%`),
                eb(sql`trim(concat_ws(' ', up.first_name, up.last_name))`, 'ilike', `%${search}%`),
            ]),
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
        )
        .orderBy('up.last_name', 'asc')
        .orderBy('up.first_name', 'asc')
        .limit(limit)
        .execute();

    // Map Kysely rows to ensure a default role of 'student' is returned
    return records.map((record) => ({
        ...record,
        role: record.role ?? 'student',
    }));
}
