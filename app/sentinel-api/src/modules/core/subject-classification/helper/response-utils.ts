export function toSubjectClassificationResponse(rawClassification: any) {
    return {
        id: rawClassification.subject_classification_id,
        name: rawClassification.name,
        type: rawClassification.classification_type,
        description: rawClassification.description ?? null,
        subject_count: Number(rawClassification.subject_count ?? 0),
        subjects: Array.isArray(rawClassification.subjects)
            ? rawClassification.subjects.map((subject: any) => ({
                  id: subject.id,
                  code: subject.code,
                  title: subject.title,
              }))
            : [],
        created_at: rawClassification.created_at ?? null,
        updated_at: rawClassification.updated_at ?? null,
        created_by: rawClassification.created_by ?? null,
        updated_by: rawClassification.updated_by ?? null,
        department_id: rawClassification.department_id ?? null,
        course_ids: Array.isArray(rawClassification.course_ids) ? rawClassification.course_ids : [],
        year_levels: Array.isArray(rawClassification.year_levels)
            ? rawClassification.year_levels.map(Number)
            : [],
        institution_id: rawClassification.institution_id ?? null,
        source_record_id: rawClassification.source_record_id ?? null,
        inheritance_status: rawClassification.inheritance_status ?? 'LOCAL',
        origin_institution_id:
            rawClassification.origin_institution_id ?? rawClassification.institution_id ?? null,
        effective_institution_id:
            rawClassification.effective_institution_id ?? rawClassification.institution_id ?? null,
        is_local: rawClassification.is_local ?? rawClassification.inheritance_status === 'LOCAL',
        is_inherited:
            rawClassification.is_inherited ?? rawClassification.inheritance_status === 'INHERITED',
        is_overridden:
            rawClassification.is_overridden ??
            rawClassification.inheritance_status === 'OVERRIDDEN',
        is_hidden: rawClassification.is_hidden ?? rawClassification.inheritance_status === 'HIDDEN',
    };
}
