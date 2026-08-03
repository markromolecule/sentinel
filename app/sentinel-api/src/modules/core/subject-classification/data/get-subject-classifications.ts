import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';

export type GetSubjectClassificationsDataArgs = {
    dbClient: DbClient;
    institutionId?: string;
    search?: string;
    includeClassificationFields?: boolean;
};

export async function getSubjectClassificationsData({
    dbClient,
    institutionId,
    search,
    includeClassificationFields = true,
}: GetSubjectClassificationsDataArgs) {
    if (!includeClassificationFields) {
        return [];
    }
    let query = dbClient
        .selectFrom('subject_classifications as sc')
        .leftJoin(
            'subject_classification_subjects as scs',
            'scs.subject_classification_id',
            'sc.subject_classification_id',
        )
        .leftJoin('subjects as sub', 'sub.subject_id', 'scs.subject_id')
        .leftJoin('user_profiles as creator', 'creator.user_id', 'sc.created_by')
        .leftJoin('user_profiles as updater', 'updater.user_id', 'sc.updated_by')
        .select([
            'sc.subject_classification_id',
            'sc.name',
            'sc.classification_type',
            'sc.description',
            'sc.department_id',
            'sc.year_levels',
            'sc.institution_id',
            'sc.source_record_id',
            'sc.inheritance_status',
            'sc.overridden_at',
            'sc.overridden_by',
            'sc.hidden_at',
            'sc.hidden_by',
            'sc.created_at',
            'sc.updated_at',
            'sc.created_by',
            'sc.updated_by',
            'creator.first_name as creator_first_name',
            'creator.last_name as creator_last_name',
            'updater.first_name as updater_first_name',
            'updater.last_name as updater_last_name',
            sql<number>`COUNT(DISTINCT sub.subject_id)::int`.as('subject_count'),
            sql<any>`COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id',
                        sub.subject_id,
                        'code',
                        sub.subject_code,
                        'title',
                        sub.subject_title
                    )
                    ORDER BY sub.subject_code
                ) FILTER (WHERE sub.subject_id IS NOT NULL),
                '[]'::jsonb
            )`.as('subjects'),
            sql<string[]>`COALESCE(
                (
                    SELECT array_agg(scc.course_id::text)
                    FROM subject_classification_courses scc
                    WHERE scc.subject_classification_id = sc.subject_classification_id
                ),
                '{}'::text[]
            )`.as('course_ids'),
        ]);

    if (institutionId) {
        query = query.where('sc.institution_id', '=', institutionId);
    }

    if (search) {
        query = query.where((eb) =>
            eb.or([
                eb('sc.name', 'ilike', `%${search}%`),
                eb('sc.description', 'ilike', `%${search}%`),
            ]),
        );
    }

    return await query
        .groupBy([
            'sc.subject_classification_id',
            'creator.first_name',
            'creator.last_name',
            'updater.first_name',
            'updater.last_name',
        ])
        .orderBy('sc.name', 'asc')
        .execute();
}
