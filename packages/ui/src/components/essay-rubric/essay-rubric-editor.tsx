'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { EssayRubricCriterion } from '@sentinel/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../ui/alert-dialog';
import { EssayRubricTable } from './essay-rubric-table';
import {
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    Save,
    RotateCcw,
    AlertTriangle,
    ShieldAlert,
    Undo,
} from 'lucide-react';

export interface EssayRubricEditorProps {
    /**
     * Initial array of rubric criteria.
     */
    initialCriteria: EssayRubricCriterion[];
    /**
     * Callback when the user saves the changes.
     */
    onSave: (criteria: EssayRubricCriterion[]) => Promise<void> | void;
    /**
     * If the save operation is currently loading/submitting.
     */
    isSaving?: boolean;
    /**
     * Optional callback to reset to baseline (e.g. for exam overrides).
     */
    onReset?: () => Promise<void> | void;
    /**
     * If the reset operation is currently loading.
     */
    isResetting?: boolean;
    /**
     * Controls whether the user has permission to override/edit.
     * If false, renders a read-only table with an explanation.
     * @default true
     */
    canOverride?: boolean;
    /**
     * If this is editing the global Support baseline.
     * Hides the reset-to-baseline option.
     * @default false
     */
    /**
     * If this is editing the global Support baseline.
     * Hides the reset-to-baseline option.
     * @default false
     */
    isSupport?: boolean;
    /**
     * Optional callback triggered when the dirty state changes.
     */
    onDirtyChange?: (isDirty: boolean) => void;
}

/**
 * Generates a unique stable key for new criteria.
 */
function generateStableKey(): string {
    return `criterion_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * EssayRubricEditor provides a complete interactive workspace for editing
 * rubric criteria, weights, and scoring level descriptions. It performs inline
 * validation (ensuring weight total equals 100%, criteria counts, and non-empty inputs)
 * and includes a split-pane layout for managing criteria and detail edits.
 *
 * @param props - Component props.
 */
export function EssayRubricEditor({
    initialCriteria,
    onSave,
    isSaving = false,
    onReset,
    isResetting = false,
    canOverride = true,
    isSupport = false,
    onDirtyChange,
}: EssayRubricEditorProps) {
    const [localCriteria, setLocalCriteria] = useState<EssayRubricCriterion[]>([]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    // Initialize local state when initialCriteria changes
    useEffect(() => {
        setLocalCriteria(JSON.parse(JSON.stringify(initialCriteria)));
        if (initialCriteria.length > 0) {
            setSelectedKey(initialCriteria[0].key);
        } else {
            setSelectedKey(null);
        }
    }, [initialCriteria]);

    // Active selected criterion for the editor form
    const activeCriterion = useMemo(() => {
        return localCriteria.find((c) => c.key === selectedKey) || null;
    }, [localCriteria, selectedKey]);

    // Check if the current state differs from the initial state
    const isDirty = useMemo(() => {
        return JSON.stringify(localCriteria) !== JSON.stringify(initialCriteria);
    }, [localCriteria, initialCriteria]);

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    // Total weight calculation
    const totalWeightPercentage = useMemo(() => {
        const sum = localCriteria.reduce((acc, c) => acc + (c.weight || 0), 0);
        return Math.round(sum * 100);
    }, [localCriteria]);

    // Validation checks
    const validationErrors = useMemo(() => {
        const errors: string[] = [];

        if (localCriteria.length < 1) {
            errors.push('At least one criterion is required.');
        }
        if (localCriteria.length > 10) {
            errors.push('A rubric cannot exceed 10 criteria.');
        }
        if (totalWeightPercentage !== 100) {
            errors.push(
                `Total weight must equal exactly 100% (currently ${totalWeightPercentage}%).`,
            );
        }

        localCriteria.forEach((c, idx) => {
            const indexLabel = `Criterion #${idx + 1}`;
            if (!c.name.trim()) {
                errors.push(`${indexLabel} is missing a name.`);
            }
            if (!c.description.trim()) {
                errors.push(`"${c.name || indexLabel}" is missing a description.`);
            }
            if (c.weight <= 0) {
                errors.push(`"${c.name || indexLabel}" weight must be greater than 0%.`);
            }
            [4, 3, 2, 1, 0].forEach((score) => {
                if (!c.levels[score]?.trim()) {
                    errors.push(
                        `"${c.name || indexLabel}" is missing description for Score Level ${score}.`,
                    );
                }
            });
        });

        return errors;
    }, [localCriteria, totalWeightPercentage]);

    const isValid = validationErrors.length === 0;

    // Handlers
    const handleAddCriterion = () => {
        if (localCriteria.length >= 10) return;

        const newKey = generateStableKey();
        const newCriterion: EssayRubricCriterion = {
            key: newKey,
            name: 'New Criterion',
            description: '',
            weight: 0,
            levels: {
                4: 'Exceptional quality, fully meets and exceeds all criteria expectations.',
                3: 'High quality, meets all criteria with only minor, negligible flaws.',
                2: 'Average quality, meets basic criteria requirements but lacks depth.',
                1: 'Substandard quality, fails to meet multiple basic requirements, incoherent.',
                0: 'Empty submission or completely unrelated response.',
            },
        };

        setLocalCriteria([...localCriteria, newCriterion]);
        setSelectedKey(newKey);
    };

    const handleRemoveCriterion = (key: string) => {
        if (localCriteria.length <= 1) return;

        const updated = localCriteria.filter((c) => c.key !== key);
        setLocalCriteria(updated);

        // Update selected key if the active one was deleted
        if (selectedKey === key) {
            setSelectedKey(updated[0]?.key || null);
        }
    };

    const handleMoveCriterion = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= localCriteria.length) return;

        const updated = [...localCriteria];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;

        setLocalCriteria(updated);
    };

    const handleUpdateActiveField = (field: keyof EssayRubricCriterion, value: any) => {
        if (!selectedKey) return;

        setLocalCriteria(
            localCriteria.map((c) => {
                if (c.key === selectedKey) {
                    return { ...c, [field]: value };
                }
                return c;
            }),
        );
    };

    const handleUpdateActiveLevel = (score: number, text: string) => {
        if (!activeCriterion) return;

        setLocalCriteria(
            localCriteria.map((c) => {
                if (c.key === selectedKey) {
                    return {
                        ...c,
                        levels: {
                            ...c.levels,
                            [score]: text,
                        },
                    };
                }
                return c;
            }),
        );
    };

    const handleDiscardChanges = () => {
        setLocalCriteria(JSON.parse(JSON.stringify(initialCriteria)));
        if (initialCriteria.length > 0) {
            setSelectedKey(initialCriteria[0].key);
        }
    };

    const handleSave = async () => {
        if (!isValid || isSaving) return;
        await onSave(localCriteria);
    };

    // Render read-only table if the user lacks override permission
    if (!canOverride) {
        return (
            <div className="space-y-6">
                <Alert
                    variant="default"
                    className="border-amber-200 bg-amber-50/50 text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200"
                >
                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="font-semibold">Read-only View</AlertTitle>
                    <AlertDescription className="text-sm">
                        {isSupport
                            ? 'You do not have permission to manage the baseline essay rubric.'
                            : 'You do not have the examinations:override_essay_rubric permission required to customize this exam’s rubric. Displaying active inherited baseline.'}
                    </AlertDescription>
                </Alert>
                <EssayRubricTable criteria={initialCriteria} />
            </div>
        );
    }

    return (
        <div className="grid items-start gap-6 lg:grid-cols-12">
            {/* Left Column: Criteria Selector & Reorder list */}
            <div className="space-y-4 lg:col-span-5">
                <Card className="border border-slate-200/80 shadow-sm dark:border-slate-800/80">
                    <CardHeader className="bg-slate-50/50 pb-4 dark:bg-slate-900/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                                    Rubric Criteria List
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500">
                                    Manage criteria order, weights, and list count.
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleAddCriterion}
                                disabled={localCriteria.length >= 10}
                                className="h-8 gap-1 text-xs"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1 p-2">
                        {localCriteria.map((criterion, idx) => {
                            const isSelected = criterion.key === selectedKey;
                            return (
                                <div
                                    key={criterion.key}
                                    onClick={() => setSelectedKey(criterion.key)}
                                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all duration-200 ${
                                        isSelected
                                            ? 'border-violet-500 bg-violet-50/50 shadow-sm dark:border-violet-600 dark:bg-violet-950/20'
                                            : 'border-slate-100 bg-transparent hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-900/20'
                                    }`}
                                >
                                    <div className="flex min-w-0 flex-col gap-1 pr-2">
                                        <span
                                            className={`text-xs font-semibold tracking-wider uppercase ${isSelected ? 'text-violet-500' : 'text-slate-400'}`}
                                        >
                                            Criterion #{idx + 1}
                                        </span>
                                        <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {criterion.name || (
                                                <em className="text-slate-400">Untitled</em>
                                            )}
                                        </span>
                                    </div>
                                    <div
                                        className="flex shrink-0 items-center gap-1.5"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Badge
                                            variant="secondary"
                                            className={`text-xs ${
                                                isSelected
                                                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                            }`}
                                        >
                                            {Math.round((criterion.weight || 0) * 100)}%
                                        </Badge>
                                        <div className="flex items-center rounded border border-slate-200/50 dark:border-slate-800">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                disabled={idx === 0}
                                                onClick={() => handleMoveCriterion(idx, 'up')}
                                                className="h-7 w-7 rounded-none border-r border-slate-200/50 dark:border-slate-800"
                                                aria-label="Move Up"
                                            >
                                                <ArrowUp className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                disabled={idx === localCriteria.length - 1}
                                                onClick={() => handleMoveCriterion(idx, 'down')}
                                                className="h-7 w-7 rounded-none"
                                                aria-label="Move Down"
                                            >
                                                <ArrowDown className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            disabled={localCriteria.length <= 1}
                                            onClick={() => handleRemoveCriterion(criterion.key)}
                                            className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                                            aria-label="Delete Criterion"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Validation Warnings */}
                {validationErrors.length > 0 && (
                    <Alert
                        variant="destructive"
                        className="border-red-200 bg-red-50/50 text-red-900 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200"
                    >
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <AlertTitle className="font-semibold">Validation Errors</AlertTitle>
                        <AlertDescription className="mt-1.5 space-y-1 text-xs">
                            {validationErrors.map((err, idx) => (
                                <p key={idx}>• {err}</p>
                            ))}
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            {/* Right Column: Active Criterion Detail Editor */}
            <div className="lg:col-span-7">
                {activeCriterion ? (
                    <Card className="border border-slate-200/80 shadow-sm dark:border-slate-800/80">
                        <CardHeader className="bg-slate-50/50 pb-4 dark:bg-slate-900/30">
                            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                                Edit Criterion Details
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                                Configure name, weight, and five performance levels.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5 p-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="criterion-name"
                                        className="text-xs font-semibold text-slate-600 dark:text-slate-400"
                                    >
                                        Criterion Name
                                    </Label>
                                    <Input
                                        id="criterion-name"
                                        type="text"
                                        value={activeCriterion.name}
                                        onChange={(e) =>
                                            handleUpdateActiveField('name', e.target.value)
                                        }
                                        placeholder="e.g. Grammar & Spelling"
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="criterion-weight"
                                        className="text-xs font-semibold text-slate-600 dark:text-slate-400"
                                    >
                                        Weight Allocation (%)
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="criterion-weight"
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={Math.round((activeCriterion.weight || 0) * 100)}
                                            onChange={(e) => {
                                                const pct = parseInt(e.target.value, 10) || 0;
                                                handleUpdateActiveField('weight', pct / 100);
                                            }}
                                            className="h-9 pr-8 text-sm"
                                        />
                                        <span className="absolute top-2 right-3 text-xs font-semibold text-slate-400">
                                            %
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="criterion-desc"
                                    className="text-xs font-semibold text-slate-600 dark:text-slate-400"
                                >
                                    General Description
                                </Label>
                                <Textarea
                                    id="criterion-desc"
                                    rows={2}
                                    value={activeCriterion.description}
                                    onChange={(e) =>
                                        handleUpdateActiveField('description', e.target.value)
                                    }
                                    placeholder="Explain the scope and criteria of this evaluation block..."
                                    className="resize-none text-sm"
                                />
                            </div>

                            <div className="space-y-4 border-t border-slate-100/80 pt-4 dark:border-slate-800/80">
                                <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                                    Performance Level Descriptions (Score 0-4)
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        {
                                            score: 4,
                                            label: 'Excellent',
                                            placeholder:
                                                'Describe criteria for a perfect score of 4...',
                                        },
                                        {
                                            score: 3,
                                            label: 'Good',
                                            placeholder: 'Describe criteria for a score of 3...',
                                        },
                                        {
                                            score: 2,
                                            label: 'Average',
                                            placeholder: 'Describe criteria for a score of 2...',
                                        },
                                        {
                                            score: 1,
                                            label: 'Poor',
                                            placeholder: 'Describe criteria for a score of 1...',
                                        },
                                        {
                                            score: 0,
                                            label: 'Zero',
                                            placeholder: 'Describe criteria for a score of 0...',
                                        },
                                    ].map(({ score, label, placeholder }) => (
                                        <div key={score} className="space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Badge className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                                                    {score}
                                                </Badge>
                                                <Label
                                                    htmlFor={`level-${score}`}
                                                    className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                                                >
                                                    {label}
                                                </Label>
                                            </div>
                                            <Textarea
                                                id={`level-${score}`}
                                                rows={2}
                                                value={activeCriterion.levels[score] || ''}
                                                onChange={(e) =>
                                                    handleUpdateActiveLevel(score, e.target.value)
                                                }
                                                placeholder={placeholder}
                                                className="resize-none text-xs"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/10">
                        <p className="text-sm text-slate-500">
                            Select or add a criterion on the left to start editing details.
                        </p>
                    </Card>
                )}
            </div>

            {/* Bottom Controls / Action Bar */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:flex-row lg:col-span-12 dark:border-slate-800/80 dark:bg-slate-900/30">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Total Rubric Weight:
                    </span>
                    <Badge
                        variant={totalWeightPercentage === 100 ? 'default' : 'destructive'}
                        className={`px-3 py-1 text-sm ${
                            totalWeightPercentage === 100
                                ? 'bg-emerald-500 text-white hover:bg-emerald-500 dark:bg-emerald-600'
                                : 'bg-amber-500 text-white hover:bg-amber-500 dark:bg-amber-600'
                        }`}
                    >
                        {totalWeightPercentage}%
                    </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Reset to Baseline Confirmation (Exam Overrides only) */}
                    {onReset && !isSupport && (
                        <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    type="button"
                                    disabled={isResetting || isSaving}
                                    className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-950/20"
                                >
                                    <RotateCcw className="mr-1.5 h-4 w-4" />
                                    Reset to Baseline
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Reset Essay Rubric to Baseline?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action will delete your exam-specific override. Future
                                        student attempts for this exam will inherit the global
                                        Support baseline rubric. Existing attempts already started
                                        will remain snapshot-frozen and unaffected.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        variant="default"
                                        onClick={async () => {
                                            setResetDialogOpen(false);
                                            await onReset();
                                        }}
                                        className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800"
                                    >
                                        Confirm Reset
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}

                    {/* Discard Changes */}
                    <Button
                        variant="outline"
                        type="button"
                        onClick={handleDiscardChanges}
                        disabled={!isDirty || isSaving || isResetting}
                        className="gap-1.5"
                    >
                        <Undo className="h-4 w-4" />
                        Discard
                    </Button>

                    {/* Save Button */}
                    <Button
                        variant="default"
                        type="button"
                        onClick={handleSave}
                        disabled={!isValid || !isDirty || isSaving || isResetting}
                        className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-800"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
