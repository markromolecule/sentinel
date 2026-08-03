interface SelectionPreviewProps {
    title: string;
    items: string[];
    emptyLabel: string;
    accent?: boolean;
    visibleLimit?: number;
}

export function SelectionPreview({
    title,
    items,
    emptyLabel,
    accent = false,
    visibleLimit = 3,
}: SelectionPreviewProps) {
    return (
        <div
            className={`flex min-h-[92px] flex-col rounded-xl border px-3 py-3 ${
                accent ? 'border-[#323d8f]/20 bg-[#323d8f]/5' : 'bg-background'
            }`}
        >
            <p className="text-foreground text-sm font-semibold">{title}</p>

            {items.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {items.slice(0, visibleLimit).map((item) => (
                        <span
                            key={item}
                            className="bg-muted text-foreground rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                        >
                            {item}
                        </span>
                    ))}
                    {items.length > visibleLimit && (
                        <span className="bg-muted text-muted-foreground flex h-[18px] items-center rounded-full px-2 text-[10px] font-bold">
                            +{items.length - visibleLimit}
                        </span>
                    )}
                </div>
            ) : (
                <p className="text-muted-foreground mt-2 text-sm leading-5">{emptyLabel}</p>
            )}
        </div>
    );
}
