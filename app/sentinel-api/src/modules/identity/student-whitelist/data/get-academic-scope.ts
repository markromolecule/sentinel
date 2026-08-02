import { type DbClient } from '@sentinel/db';

export async function getAcademicScopeData({
    dbClient,
    institutionId,
    departmentId,
    courseId,
}: {
    dbClient: DbClient;
    institutionId: string;
    departmentId: string;
    courseId: string;
}) {
    const [institution, academicScope] = await Promise.all([
        dbClient
            .selectFrom('institutions')
            .select(['parent_institution_id'])
            .where('id', '=', institutionId)
            .executeTakeFirst(),
        dbClient
            .selectFrom('departments as dept')
            .leftJoin('courses as course', (join) =>
                join
                    .onRef('course.department_id', '=', 'dept.department_id')
                    .on('course.course_id', '=', courseId),
            )
            .leftJoin(
                'departments as course_dept',
                'course_dept.department_id',
                'course.department_id',
            )
            .select((eb) => [
                'dept.department_id',
                'dept.institution_id as department_institution_id',
                'dept.source_record_id as department_source_record_id',
                'dept.inheritance_status as department_inheritance_status',
                'course.course_id',
                'course.department_id as course_department_id',
                'course.institution_id as course_institution_id',
                'course.source_record_id as course_source_record_id',
                'course.inheritance_status as course_inheritance_status',
                'course_dept.source_record_id as course_department_source_record_id',
                eb
                    .exists(
                        eb
                            .selectFrom('courses as existing_course')
                            .select('existing_course.course_id')
                            .where('existing_course.course_id', '=', courseId),
                    )
                    .as('course_exists'),
                eb
                    .exists(
                        eb
                            .selectFrom('departments as hidden_department')
                            .select('hidden_department.department_id')
                            .where('hidden_department.institution_id', '=', institutionId)
                            .where('hidden_department.source_record_id', '=', departmentId)
                            .where('hidden_department.inheritance_status', '=', 'HIDDEN'),
                    )
                    .as('department_hidden_in_selected_institution'),
                eb
                    .exists(
                        eb
                            .selectFrom('courses as hidden_course')
                            .select('hidden_course.course_id')
                            .where('hidden_course.institution_id', '=', institutionId)
                            .where('hidden_course.source_record_id', '=', courseId)
                            .where('hidden_course.inheritance_status', '=', 'HIDDEN'),
                    )
                    .as('course_hidden_in_selected_institution'),
            ])
            .where('dept.department_id', '=', departmentId)
            .executeTakeFirst(),
    ]);

    if (!academicScope) {
        return undefined;
    }

    return {
        ...academicScope,
        selected_institution_parent_id: institution?.parent_institution_id ?? null,
    };
}
