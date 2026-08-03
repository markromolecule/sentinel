import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';

export type DeleteEmptyDuplicateSubjectOfferingsDataArgs = {
    dbClient: DbClient;
    institutionId?: string | null;
};

export async function deleteEmptyDuplicateSubjectOfferingsData({
    dbClient,
    institutionId,
}: DeleteEmptyDuplicateSubjectOfferingsDataArgs) {
    const scopedInstitutionId = institutionId ?? null;

    const result = await sql<{ subject_offering_id: string }>`
        WITH stale_empty_offerings AS (
            SELECT empty.subject_offering_id
            FROM subject_offerings empty
            WHERE empty.inheritance_status IS DISTINCT FROM 'HIDDEN'
              AND (
                  ${scopedInstitutionId}::uuid IS NULL
                  OR empty.institution_id = ${scopedInstitutionId}::uuid
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM subject_offering_departments departments
                  WHERE departments.subject_offering_id = empty.subject_offering_id
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM subject_offering_courses courses
                  WHERE courses.subject_offering_id = empty.subject_offering_id
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM subject_offering_sections sections
                  WHERE sections.subject_offering_id = empty.subject_offering_id
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM subject_offering_year_levels year_levels
                  WHERE year_levels.subject_offering_id = empty.subject_offering_id
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM class_groups classrooms
                  WHERE classrooms.subject_offering_id = empty.subject_offering_id
              )
              AND EXISTS (
                  SELECT 1
                  FROM subject_offerings sibling
                  WHERE sibling.subject_offering_id <> empty.subject_offering_id
                    AND sibling.subject_id = empty.subject_id
                    AND sibling.term_id = empty.term_id
                    AND sibling.institution_id IS NOT DISTINCT FROM empty.institution_id
                    AND sibling.inheritance_status IS DISTINCT FROM 'HIDDEN'
                    AND (
                        EXISTS (
                            SELECT 1
                            FROM subject_offering_departments sibling_departments
                            WHERE sibling_departments.subject_offering_id = sibling.subject_offering_id
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM subject_offering_courses sibling_courses
                            WHERE sibling_courses.subject_offering_id = sibling.subject_offering_id
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM subject_offering_sections sibling_sections
                            WHERE sibling_sections.subject_offering_id = sibling.subject_offering_id
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM subject_offering_year_levels sibling_year_levels
                            WHERE sibling_year_levels.subject_offering_id = sibling.subject_offering_id
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM class_groups sibling_classrooms
                            WHERE sibling_classrooms.subject_offering_id = sibling.subject_offering_id
                        )
                    )
              )
        )
        DELETE FROM subject_offerings offerings
        USING stale_empty_offerings stale
        WHERE offerings.subject_offering_id = stale.subject_offering_id
        RETURNING offerings.subject_offering_id
    `.execute(dbClient);

    return result.rows.map((row) => row.subject_offering_id);
}
