import { HistoryHeaderProps } from "../_types";

export function HistoryHeader({ title, description }: HistoryHeaderProps) {
    return (
        <div className="space-y-2 py-4">
            <h1 className="text-4xl font-bold text-white">{title}</h1>
            <p className="text-white/60 text-lg">
                {description}
            </p>
        </div>
    );
}
