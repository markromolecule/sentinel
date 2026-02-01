import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useSubjectStore, type Subject } from "@/stores/use-subject-store";

interface SubjectCardProps {
    subject: Subject;
}

export function SubjectCard({ subject }: SubjectCardProps) {
    const removeSubject = useSubjectStore((state) => state.removeSubject);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{subject.code}</CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                    onClick={() => removeSubject(subject.id)}
                >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove subject</span>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{subject.title}</div>
                <p className="text-xs text-muted-foreground mt-1">
                    Section: {subject.section}
                </p>
            </CardContent>
        </Card>
    );
}
