import type { PassageType } from '@sentinel/shared/types';
import {
    Button,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
    Label,
    PassageEditor,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Textarea,
} from '@sentinel/ui';
import { Eye } from 'lucide-react';
import { hasPassageContent } from './utils';

type PassageEditorPanelProps = {
    builderMode: boolean;
    onOpenPreview: () => void;
    onPassageContentChange: (value: string) => void;
    onPassageImageUpload: (file: File) => Promise<string>;
    onPassageTypeChange: (value: PassageType) => void;
    passageContent: string;
    passagePreviewAvailable: boolean;
    passageType: PassageType;
};

export function PassageEditorPanel({
    builderMode,
    onOpenPreview,
    onPassageContentChange,
    onPassageImageUpload,
    onPassageTypeChange,
    passageContent,
    passagePreviewAvailable,
    passageType,
}: PassageEditorPanelProps) {
    const hasPassage = hasPassageContent(passageType, passageContent);

    return (
        <section
            className={
                builderMode
                    ? 'h-full space-y-4'
                    : 'border-border/60 bg-background rounded-2xl border p-6 shadow-sm'
            }
        >
            <Collapsible defaultOpen={hasPassage} className="h-full space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                        <Label className="text-sm font-medium">Passage</Label>
                        <p className="text-muted-foreground text-xs">
                            Keep the passage and the question side by side while you edit.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={onOpenPreview}
                            disabled={!passagePreviewAvailable}
                        >
                            <Eye className="h-4 w-4" />
                            Preview passage
                        </Button>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" type="button">
                                {hasPassage ? 'Hide' : 'Add'} passage
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </div>
                <CollapsibleContent className="h-full space-y-4">
                    <div className="grid max-w-[220px] gap-3">
                        <Label className="text-sm font-medium">Passage type</Label>
                        <Select
                            value={passageType}
                            onValueChange={(value) => onPassageTypeChange(value as PassageType)}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select passage type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="plain">Plain text</SelectItem>
                                <SelectItem value="html">HTML</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-3">
                        <Label className="text-sm font-medium">
                            {passageType === 'html' ? 'Passage HTML' : 'Passage text'}
                        </Label>
                        {passageType === 'html' ? (
                            <PassageEditor
                                value={passageContent}
                                onChange={onPassageContentChange}
                                placeholder="<p>Write rich passage HTML here...</p>"
                                onImageUpload={onPassageImageUpload}
                                className={builderMode ? 'h-full' : undefined}
                            />
                        ) : (
                            <Textarea
                                placeholder="Write the passage text here..."
                                className={builderMode ? 'h-full min-h-[540px]' : 'min-h-[300px]'}
                                value={passageContent}
                                onChange={(event) => onPassageContentChange(event.target.value)}
                            />
                        )}
                        <p className="text-muted-foreground text-xs">
                            {passageType === 'html'
                                ? 'HTML passages are sanitized on render. Keep images on stable URLs and use valid markup.'
                                : 'Plain passages render as literal text with line breaks preserved.'}
                        </p>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </section>
    );
}
