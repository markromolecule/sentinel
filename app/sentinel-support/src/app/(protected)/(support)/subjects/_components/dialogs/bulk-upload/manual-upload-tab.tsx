'use client';

import { Textarea } from '@sentinel/ui';
import { BulkUploadPreview } from './bulk-upload-preview';

const BULK_UPLOAD_PLACEHOLDER = `Code, Title
GEACM01X, Advanced Communication
CC103, Data Structures and Algorithms`;

interface ManualUploadTabProps {
    input: string;
    onInputChange: (value: string) => void;
    isImporting: boolean;
    preview: {
        rows: Array<{ code: string; title: string; sourceLabel: string }>;
        errors: string[];
    };
}

export function ManualUploadTab({
    input,
    onInputChange,
    isImporting,
    preview,
}: ManualUploadTabProps) {
    return (
        <div className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="flex flex-col gap-3">
                <div className="bg-muted/20 rounded-lg border p-4">
                    <p className="text-sm font-medium">Accepted format</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                        One subject per line using <code>Code, Title</code>. Header rows are
                        optional.
                    </p>
                </div>

                <Textarea
                    placeholder={BULK_UPLOAD_PLACEHOLDER}
                    className="min-h-[260px] flex-1 resize-none font-mono text-sm"
                    value={input}
                    onChange={(event) => onInputChange(event.target.value)}
                    disabled={isImporting}
                />
            </div>

            <BulkUploadPreview
                rows={preview.rows}
                errors={preview.errors}
                emptyMessage="Paste subject rows here to see a live preview before importing."
            />
        </div>
    );
}
