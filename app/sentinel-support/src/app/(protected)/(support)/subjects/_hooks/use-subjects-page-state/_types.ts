import { MasterSubject } from '@sentinel/shared/types';

export type SubjectFormState = {
    id?: string;
    code: string;
    title: string;
    institutionId?: string;
    isInherited?: boolean;
};

export const EMPTY_SUBJECT_FORM: SubjectFormState = {
    code: '',
    title: '',
};

export function getSubjectId(subject: MasterSubject) {
    return subject.id ?? subject.subject_id ?? '';
}
