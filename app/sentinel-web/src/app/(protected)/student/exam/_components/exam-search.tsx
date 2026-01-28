import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { type ExamSearchProps } from "@/app/(protected)/student/_types";

export function ExamSearch({ value, onChange }: ExamSearchProps) {
    return (
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <Input
                type="text"
                placeholder="Search your exams..."
                className="pl-11 h-14 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:border-primary focus:ring-primary/20 transition-all text-lg"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
