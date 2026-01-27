import { HistoryListProps } from "../_types";
import { HistoryCard } from "./history-card";
import { HistoryEmpty } from "./history-empty";

export function HistoryList({ items }: HistoryListProps) {
    if (items.length === 0) {
        return <HistoryEmpty />;
    }

    return (
        <div className="grid gap-3">
            {items.map((item) => (
                <HistoryCard key={item.id} item={item} />
            ))}
        </div>
    );
}
