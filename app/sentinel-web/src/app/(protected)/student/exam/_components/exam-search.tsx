import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { type ExamSearchProps } from "@/app/(protected)/student/_types";

export function ExamSearch({ value, onChange }: ExamSearchProps) {
    return (
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-white/40 group-focus-within:text-[#323d8f] transition-colors" />
            </div>
            <Input
                type="text"
                placeholder="Search your exams..."
                className="pl-11 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl focus:border-[#323d8f] focus:ring-[#323d8f]/20 transition-all text-lg"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
