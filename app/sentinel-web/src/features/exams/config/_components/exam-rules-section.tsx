import type { ExaminationGlobalSettings } from '@sentinel/shared/types';
import { useFormContext } from 'react-hook-form';
import { ConfigToggleRow } from './config-toggle-row';
import type { ExamConfigurationState } from '@sentinel/services';
import type { FieldPath } from 'react-hook-form';

type ExamRuleOption = {
    name: FieldPath<ExamConfigurationState>;
    label: string;
    description: string;
    getChecked?: (value: unknown) => boolean;
    getValue?: (checked: boolean) => unknown;
};

export const EXAM_RULE_OPTIONS: ExamRuleOption[] = [
    {
        name: 'settings.shuffleQuestions' as const,
        label: 'Shuffle questions',
        description: 'Present questions in a varied order for each student attempt.',
    },
    {
        name: 'settings.randomizeChoices' as const,
        label: 'Randomize answer choices',
        description: 'Change option order inside supported multiple-choice questions.',
    },
    {
        name: 'settings.allowReview' as const,
        label: 'Allow review before submission',
        description:
            'Let students revisit previous questions while the attempt is still in progress.',
    },
    {
        name: 'settings.showCorrectAnswers' as const,
        label: 'Show correct answers',
        description: 'Reveal correct responses after submission when post-exam review is allowed.',
    },
    {
        name: 'configuration.lobbyAdmissionMode' as const,
        label: 'Require instructor admit',
        description: 'Hold students in the lobby until an instructor admits them.',
        getChecked: (value: unknown) => value === 'INSTRUCTOR_GATED',
        getValue: (checked: boolean) => (checked ? 'INSTRUCTOR_GATED' : 'AUTOMATIC'),
    },
    {
        name: 'configuration.releaseScoreMode' as const,
        label: 'Auto-release student scores',
        description: 'Immediately release grades to students upon exam submission.',
        getChecked: (value: unknown) => value !== 'MANUAL_RELEASE',
        getValue: (checked: boolean) => (checked ? 'AUTO_RELEASE' : 'MANUAL_RELEASE'),
    },
];

function resolveGlobalBackedRuleMetadata(args: {
    optionName: FieldPath<ExamConfigurationState>;
    currentValues: ExamConfigurationState;
    examinationDefaults?: ExaminationGlobalSettings;
}) {
    const { optionName, currentValues, examinationDefaults } = args;

    if (!examinationDefaults) {
        return null;
    }

    switch (optionName) {
        case 'settings.shuffleQuestions': {
            const inherited =
                currentValues.settings.shuffleQuestions ===
                examinationDefaults.defaultShuffleQuestions;
            return {
                badge: inherited ? 'Inherited' : 'Exam override',
                description: inherited
                    ? 'Uses the institution default for shuffle questions.'
                    : 'Overrides the institution default for shuffle questions.',
            };
        }
        case 'settings.randomizeChoices': {
            const inherited =
                currentValues.settings.randomizeChoices ===
                examinationDefaults.defaultRandomizeChoices;
            return {
                badge: inherited ? 'Inherited' : 'Exam override',
                description: inherited
                    ? 'Uses the institution default for randomized answer choices.'
                    : 'Overrides the institution default for randomized answer choices.',
            };
        }
        case 'settings.allowReview': {
            const inherited =
                currentValues.settings.allowReview === examinationDefaults.defaultAllowReview;
            return {
                badge: inherited ? 'Inherited' : 'Exam override',
                description: inherited
                    ? 'Uses the institution default for student review access.'
                    : 'Overrides the institution default for student review access.',
            };
        }
        case 'settings.showCorrectAnswers': {
            const inherited =
                currentValues.settings.showCorrectAnswers ===
                examinationDefaults.defaultShowCorrectAnswers;
            return {
                badge: inherited ? 'Inherited' : 'Exam override',
                description: inherited
                    ? 'Uses the institution default for showing correct answers.'
                    : 'Overrides the institution default for showing correct answers.',
            };
        }
        case 'configuration.lobbyAdmissionMode': {
            const inherited =
                currentValues.configuration.lobbyAdmissionMode ===
                examinationDefaults.defaultLobbyAdmissionMode;
            return {
                badge: inherited ? 'Inherited' : 'Exam override',
                description: inherited
                    ? 'Uses the institution default for lobby admission.'
                    : 'Overrides the institution default for lobby admission.',
            };
        }
        default:
            return null;
    }
}

/**
 * ExamRulesSection renders the shared exam rule toggles inside the configuration form.
 *
 * @returns The exam rules toggle group.
 */
export function ExamRulesSection(args: { examinationDefaults?: ExaminationGlobalSettings }) {
    const { examinationDefaults } = args;
    const { watch } = useFormContext<ExamConfigurationState>();
    const currentValues = watch();

    return (
        <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Changes to question order, randomized choices, review access, or score release apply
                only to attempts started after the change. Active and submitted attempts keep their
                stored exam snapshot.
            </div>
            {EXAM_RULE_OPTIONS.map((option) => {
                const ruleMetadata = resolveGlobalBackedRuleMetadata({
                    optionName: option.name,
                    currentValues,
                    examinationDefaults,
                });

                return (
                    <ConfigToggleRow
                        key={option.name}
                        name={option.name}
                        label={option.label}
                        description={option.description}
                        statusBadge={ruleMetadata?.badge}
                        statusDescription={ruleMetadata?.description}
                        getChecked={option.getChecked}
                        getValue={option.getValue}
                    />
                );
            })}
        </div>
    );
}
