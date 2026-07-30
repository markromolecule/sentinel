import type { KeyboardEvent } from 'react';
import {
    Badge,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Textarea,
} from '@sentinel/ui';
import { X } from 'lucide-react';
import type { ExamQuestionContent, QuestionDifficulty } from '@sentinel/shared/types';
import { DIFFICULTY_OPTIONS } from './constants';

type QuestionSettingsSectionProps = {
    builderMode: boolean;
    content: ExamQuestionContent;
    difficulty: QuestionDifficulty;
    onDifficultyChange: (value: QuestionDifficulty) => void;
    onPointsChange: (value: number) => void;
    onPromptChange: (prompt: string) => void;
    onRemoveTag: (tag: string) => void;
    onTagInputChange: (value: string) => void;
    onTagKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    points: number;
    tagInput: string;
    tags: string[];
};

export function QuestionSettingsSection({
    builderMode,
    content,
    difficulty,
    onDifficultyChange,
    onPointsChange,
    onPromptChange,
    onRemoveTag,
    onTagInputChange,
    onTagKeyDown,
    points,
    tagInput,
    tags,
}: QuestionSettingsSectionProps) {
    return (
        <section
            className={
                builderMode
                    ? 'space-y-6'
                    : 'border-border/60 bg-background space-y-6 rounded-2xl border p-6 shadow-sm'
            }
        >
            <div className="grid gap-3">
                <Label className="text-sm font-medium">Question Prompt</Label>
                <Textarea
                    placeholder="Type your question here..."
                    className={builderMode ? 'min-h-[180px]' : 'min-h-[160px]'}
                    value={content.prompt ?? ''}
                    onChange={(event) => onPromptChange(event.target.value)}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid max-w-[220px] gap-3">
                    <Label className="text-sm font-medium">Difficulty</Label>
                    <Select
                        value={difficulty}
                        onValueChange={(value) => onDifficultyChange(value as QuestionDifficulty)}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                            {DIFFICULTY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid max-w-[220px] gap-3">
                    <Label className="text-sm font-medium">Points</Label>
                    <Input
                        type="number"
                        value={points}
                        onChange={(event) => onPointsChange(Number(event.target.value) || 0)}
                        className="h-9"
                    />
                </div>
            </div>

            <div className="grid gap-3">
                <Label className="text-sm font-medium">Tags</Label>
                <div className="border-border/60 bg-background focus-within:ring-ring flex min-h-[42px] flex-wrap items-center gap-2 rounded-md border px-3 py-2 focus-within:ring-2 focus-within:ring-offset-2">
                    {tags.map((tag) => (
                        <Badge
                            key={tag}
                            variant="secondary"
                            className="flex items-center gap-1 py-0.5"
                        >
                            {tag}
                            <button
                                type="button"
                                onClick={() => onRemoveTag(tag)}
                                className="hover:text-destructive h-3 w-3"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                    <input
                        placeholder={
                            tags.length === 0
                                ? 'Add tags (press Enter or comma to add)...'
                                : 'Add more tags...'
                        }
                        className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
                        value={tagInput}
                        onChange={(event) => onTagInputChange(event.target.value)}
                        onKeyDown={onTagKeyDown}
                    />
                </div>
            </div>
        </section>
    );
}
