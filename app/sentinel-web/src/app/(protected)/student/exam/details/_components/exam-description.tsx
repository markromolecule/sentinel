import { ExamDescriptionProps } from "@/app/(protected)/student/_types";

export function ExamDescription({ description }: ExamDescriptionProps) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                <p className="text-white/70 leading-relaxed text-lg">
                    {description}
                </p>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-3">Instructions</h3>
                <ul className="space-y-3">
                    {[
                        "Ensure stable internet connection.",
                        "Full-screen mode will be enforced.",
                        "No tab switching allowed.",
                        "Review answers before submitting."
                    ].map((instruction, i) => (
                        <li key={i} className="flex gap-3 text-white/70">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#323d8f] mt-2.5 flex-shrink-0" />
                            <span>{instruction}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
