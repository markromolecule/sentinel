import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWizardPublish } from './use-wizard-publish';
import type { WizardDraft } from '../../_types';
import {
    createCourse,
    createDepartment,
    createInstitution,
    createSemester,
    createSubject,
    saveInstitutionNamingConventions,
    updateInstitution,
    updateSubject,
} from '@sentinel/services';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@sentinel/services', () => ({
    createCourse: vi.fn(),
    createDepartment: vi.fn(),
    createInstitution: vi.fn(),
    createSemester: vi.fn(),
    createSubject: vi.fn(),
    saveInstitutionNamingConventions: vi.fn(),
    updateInstitution: vi.fn(),
    updateSubject: vi.fn(),
}));

const INSTITUTION_ID = '11111111-1111-4111-8111-111111111111';
const EXISTING_SUBJECT_ID = '22222222-2222-4222-8222-222222222222';
const UNCHANGED_SUBJECT_ID = '33333333-3333-4333-8333-333333333333';

function createDraft(overrides: Partial<WizardDraft> = {}): WizardDraft {
    return {
        identity: {
            id: INSTITUTION_ID,
            name: 'National University',
            code: 'NU',
            institutionKind: 'PARENT',
            parentInstitutionId: '',
        },
        departments: [],
        courses: [],
        terms: [],
        subjects: [
            {
                clientId: EXISTING_SUBJECT_ID,
                persistedId: EXISTING_SUBJECT_ID,
                code: 'GEACM01X',
                title: 'Advanced Communication',
                initialCode: 'GEACM01',
                initialTitle: 'Advanced Communication',
                isInherited: false,
                sourceRecordId: null,
            },
            {
                clientId: UNCHANGED_SUBJECT_ID,
                persistedId: UNCHANGED_SUBJECT_ID,
                code: 'GEART01X',
                title: 'Art Appreciation',
                initialCode: 'GEART01X',
                initialTitle: 'Art Appreciation',
                isInherited: false,
                sourceRecordId: null,
            },
            {
                clientId: 'new-subject-client-id',
                code: 'NEW101',
                title: 'New Subject',
            },
        ],
        naming: {
            room: {
                label: 'Room',
                prefix: 'RM',
                virtualPrefix: 'VR',
            },
            sectionRulesByCourseClientId: {},
        },
        ...overrides,
    };
}

describe('useWizardPublish', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(updateInstitution).mockResolvedValue({ id: INSTITUTION_ID } as any);
        vi.mocked(updateSubject).mockResolvedValue({ id: EXISTING_SUBJECT_ID } as any);
        vi.mocked(createSubject).mockResolvedValue({ id: 'created-subject-id' } as any);
        vi.mocked(saveInstitutionNamingConventions).mockResolvedValue({} as any);
    });

    it('updates existing subjects and creates only new rows when editing an institution', async () => {
        const validateStep = vi.fn(() => true);
        const setActiveStep = vi.fn();
        const setErrors = vi.fn();
        const setHasUnsavedProgress = vi.fn();
        const onSuccess = vi.fn();

        const { result } = renderHook(() =>
            useWizardPublish({
                apiClient: vi.fn() as any,
                draft: createDraft({ identity: { ...createDraft().identity, id: undefined } }),
                editInstitutionId: INSTITUTION_ID,
                validateStep,
                setActiveStep,
                setErrors,
                setHasUnsavedProgress,
                onSuccess,
            }),
        );

        await act(async () => {
            await result.current.publishSetup();
        });

        expect(createInstitution).not.toHaveBeenCalled();
        expect(createDepartment).not.toHaveBeenCalled();
        expect(createCourse).not.toHaveBeenCalled();
        expect(createSemester).not.toHaveBeenCalled();
        expect(updateInstitution).toHaveBeenCalledWith(expect.any(Function), {
            id: INSTITUTION_ID,
            payload: {
                name: 'National University',
                code: 'NU',
                institutionKind: 'PARENT',
                parentInstitutionId: null,
            },
        });
        expect(updateSubject).toHaveBeenCalledTimes(1);
        expect(updateSubject).toHaveBeenCalledWith(expect.any(Function), {
            id: EXISTING_SUBJECT_ID,
            payload: {
                code: 'GEACM01X',
                title: 'Advanced Communication',
                institution_id: INSTITUTION_ID,
            },
        });
        expect(createSubject).toHaveBeenCalledTimes(1);
        expect(createSubject).toHaveBeenCalledWith(expect.any(Function), {
            code: 'NEW101',
            title: 'New Subject',
            institution_id: INSTITUTION_ID,
        });
        expect(saveInstitutionNamingConventions).toHaveBeenCalledWith(expect.any(Function), {
            institutionId: INSTITUTION_ID,
            payload: {
                roomCodeFormat: 'Room',
                sectionCodeFormat: null,
                namingRules: {
                    room: {
                        label: 'Room',
                        prefix: 'RM',
                        virtualPrefix: 'VR',
                    },
                    sectionRulesByCourseId: {},
                },
            },
        });
        expect(setHasUnsavedProgress).toHaveBeenCalledWith(false);
        expect(onSuccess).toHaveBeenCalled();
    });
});
