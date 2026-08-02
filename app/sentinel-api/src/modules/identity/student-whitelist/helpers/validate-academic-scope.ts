import { type DbClient } from '@sentinel/db';
import { getAcademicScopeData } from '../data/get-academic-scope';

function isVisibleInInstitution({
    recordInstitutionId,
    selectedInstitutionId,
    selectedInstitutionParentId,
    inheritanceStatus,
    hasHiddenOverride,
}: {
    recordInstitutionId: string | null;
    selectedInstitutionId: string;
    selectedInstitutionParentId: string | null;
    inheritanceStatus: string | null;
    hasHiddenOverride: boolean;
}) {
    if (inheritanceStatus === 'HIDDEN') {
        return false;
    }

    if (recordInstitutionId === selectedInstitutionId) {
        return true;
    }

    return recordInstitutionId === selectedInstitutionParentId && !hasHiddenOverride;
}

export async function validateAcademicScope(
    dbClient: DbClient,
    {
        institutionId,
        departmentId,
        courseId,
    }: {
        institutionId: string;
        departmentId: string;
        courseId: string;
    },
) {
    const academicScope = await getAcademicScopeData({
        dbClient,
        institutionId,
        departmentId,
        courseId,
    });

    if (!academicScope) {
        throw new Error('Department not found');
    }

    const departmentIsVisible = isVisibleInInstitution({
        recordInstitutionId: academicScope.department_institution_id,
        selectedInstitutionId: institutionId,
        selectedInstitutionParentId: academicScope.selected_institution_parent_id,
        inheritanceStatus: academicScope.department_inheritance_status,
        hasHiddenOverride: Boolean(academicScope.department_hidden_in_selected_institution),
    });

    if (!departmentIsVisible) {
        throw new Error('Department does not belong to the selected institution');
    }

    if (!academicScope.course_exists) {
        throw new Error('Course not found');
    }

    if (!academicScope.course_id) {
        throw new Error('Course does not belong to the selected department');
    }

    const courseBelongsToDepartment =
        academicScope.course_department_id === departmentId ||
        academicScope.course_department_source_record_id === departmentId ||
        academicScope.department_source_record_id === academicScope.course_department_id;

    if (!courseBelongsToDepartment) {
        throw new Error('Course does not belong to the selected department');
    }

    const courseIsVisible = isVisibleInInstitution({
        recordInstitutionId: academicScope.course_institution_id,
        selectedInstitutionId: institutionId,
        selectedInstitutionParentId: academicScope.selected_institution_parent_id,
        inheritanceStatus: academicScope.course_inheritance_status,
        hasHiddenOverride: Boolean(academicScope.course_hidden_in_selected_institution),
    });

    if (!courseIsVisible) {
        throw new Error('Course does not belong to the selected institution');
    }
}
