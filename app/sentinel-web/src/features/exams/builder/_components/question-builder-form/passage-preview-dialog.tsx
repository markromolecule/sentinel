import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@sentinel/ui';

type PassagePreviewDialogProps = {
    onOpenChange: (open: boolean) => void;
    open: boolean;
    previewHtml?: string;
};

export function PassagePreviewDialog({
    onOpenChange,
    open,
    previewHtml,
}: PassagePreviewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Passage Preview</DialogTitle>
                    <DialogDescription>
                        This is a live preview of how the current passage will render.
                    </DialogDescription>
                </DialogHeader>
                <div className="border-border/60 bg-background max-h-[70vh] overflow-auto rounded-lg border p-4">
                    {previewHtml ? (
                        <div
                            className="text-foreground text-sm leading-6"
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                    ) : (
                        <p className="text-muted-foreground text-sm">
                            Add passage content to see a preview.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
