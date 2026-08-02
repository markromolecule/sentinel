export type InstitutionKind = 'STANDALONE' | 'PARENT' | 'CHILD';

export type SimpleInstitution = {
    id: string;
    name: string;
    institutionKind: InstitutionKind;
};

export type WizardDepartment = {
    clientId: string;
    name: string;
    code: string;
    isInherited?: boolean;
    sourceRecordId?: string | null;
};

export type WizardCourse = {
    clientId: string;
    title: string;
    code: string;
    departmentClientId: string;
    isInherited?: boolean;
    sourceRecordId?: string | null;
};

export type RoomType = 'LECTURE' | 'LABORATORY' | 'VIRTUAL';

export type WizardTerm = {
    clientId: string;
    academicYear: string;
    semester: string;
    isActive: boolean;
    startDate: string;
    endDate: string;
};

export type WizardSubject = {
    clientId: string;
    persistedId?: string | null;
    code: string;
    title: string;
    initialCode?: string;
    initialTitle?: string;
    isInherited?: boolean;
    sourceRecordId?: string | null;
};

export type SectionNamingRule = {
    courseId: string;
    format: string;
    preview: string;
};

export type WizardDraft = {
    identity: {
        id?: string;
        name: string;
        code: string;
        institutionKind: InstitutionKind;
        parentInstitutionId: string;
    };
    departments: WizardDepartment[];
    courses: WizardCourse[];
    terms: WizardTerm[];
    subjects: WizardSubject[];
    naming: {
        room: {
            label: string;
            prefix: string;
            virtualPrefix: string;
        };
        sectionRulesByCourseClientId: Record<string, SectionNamingRule>;
    };
};

export type SubjectImportRow = {
    code: string;
    title: string;
    sourceLabel: string;
};

export type SubjectImportPreview = {
    rows: SubjectImportRow[];
    errors: string[];
};

export type WizardSummary = {
    departments: number;
    courses: number;
    terms: number;
    subjects: number;
    namingConventions: number;
};
