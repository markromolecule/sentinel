import { describe, it, expect } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { assertExamConfigurationMutable } from './services/assert-exam-configuration-mutable.service';
import {
    normalizeExamConfigurationState,
    normalizeExamSettingsState,
} from './services/normalize-exam-configuration-state.service';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '@sentinel/shared/constants';
import { buildDefaultExamConfiguration } from './services/build-default-exam-configuration.service';
import { mapExamConfigurationState } from './services/map-exam-configuration-state.service';

describe('Examination configuration guards', () => {
    it('normalizes settings through the shared schema contract', () => {
        const result = normalizeExamSettingsState({
            shuffleQuestions: true,
            showCorrectAnswers: false,
            allowReview: true,
            randomizeChoices: false,
        });

        expect(result).toEqual({
            shuffleQuestions: true,
            showCorrectAnswers: false,
            allowReview: true,
            randomizeChoices: false,
        });
    });

    it('disables camera and mic dependent AI rules when the required device is not enforced', () => {
        const result = normalizeExamConfigurationState({
            lobbyAdmissionMode: 'AUTOMATIC',
            maxReconnectAttempts: 3,
            strictMode: true,
            screenLock: true,
            cameraRequired: false,
            micRequired: false,
            autoSubmitTimeoutMinutes: 5,
            aiRules: {
                gaze_tracking: true,
                face_detection: true,
                audio_anomaly_detection: true,
                multiple_faces_detection: true,
            },
            webSecurity: {
                tab_switching_monitor: true,
                full_screen_required: true,
                clipboard_control: true,
                right_click_disable: true,
                print_screen_disable: true,
            },
            mobileSecurity: {
                app_pinning_required: true,
                prevent_backgrounding: true,
                notification_block: true,
                screenshot_block: true,
                root_jailbreak_detection: true,
            },
        });

        expect(result.aiRules).toEqual({
            gaze_tracking: false,
            face_detection: false,
            audio_anomaly_detection: false,
            multiple_faces_detection: false,
        });
    });

    it('blocks configuration edits after publication', () => {
        expect(() =>
            assertExamConfigurationMutable({
                status: 'PUBLISHED',
                published_at: '2026-04-13T01:00:00.000Z',
            }),
        ).toThrowError(HTTPException);
    });

    it('defaults instructor admit to enabled when global settings require it', () => {
        const result = buildDefaultExamConfiguration({
            ...DEFAULT_EXAMINATION_GLOBAL_SETTINGS,
            defaultLobbyAdmissionMode: 'INSTRUCTOR_GATED',
        });

        expect(result.lobbyAdmissionMode).toBe('INSTRUCTOR_GATED');
    });

    it('uses the global lobby admission default when no exam configuration exists', () => {
        expect(mapExamConfigurationState(null).configuration.lobbyAdmissionMode).toBe(
            buildDefaultExamConfiguration().lobbyAdmissionMode,
        );
    });

    it('uses global defaults for general exam settings when exam overrides are null', () => {
        const result = mapExamConfigurationState(
            {
                shuffle_questions: null,
                show_correct_answers: null,
                allow_review: null,
                randomize_choices: null,
            } as any,
            {
                ...DEFAULT_EXAMINATION_GLOBAL_SETTINGS,
                defaultShuffleQuestions: true,
                defaultAllowReview: true,
            },
        );

        expect(result.settings).toEqual({
            shuffleQuestions: true,
            showCorrectAnswers: false,
            allowReview: true,
            randomizeChoices: true,
        });
    });

    it('maps automaticClosePolicy from aiRules and fallback to defaults', () => {
        const defaultConfig = buildDefaultExamConfiguration();
        const mappedDefault = mapExamConfigurationState(null);
        expect(mappedDefault.configuration.automaticClosePolicy).toEqual(
            defaultConfig.automaticClosePolicy,
        );

        const mockRecord = {
            ai_rules: {
                automaticClosePolicy: {
                    enabled: true,
                    highIncidentThreshold: 5,
                    windowMinutes: 10,
                    useOccurrenceCount: true,
                    immediateCloseEventTypes: ['tab_exit'],
                },
            },
        } as any;

        const mappedCustom = mapExamConfigurationState(mockRecord);
        expect(mappedCustom.configuration.automaticClosePolicy).toEqual({
            enabled: true,
            highIncidentThreshold: 5,
            windowMinutes: 10,
            useOccurrenceCount: true,
            immediateCloseEventTypes: ['tab_exit'],
        });
    });
});
