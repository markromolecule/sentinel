import { Award } from "lucide-react";

export function HistoryEmpty() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-2xl border border-white/5 border-dashed">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Award className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No history found</h3>
            <p className="text-white/40 max-w-md mx-auto">
                Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
        </div>
    );
}
