import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent } from '@sentinel/ui';

export type ReportErrorProps = {
    refetch: () => void;
};

export function ReportError({ refetch }: ReportErrorProps) {
    return (
        <div className="flex h-full flex-1 flex-col space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Exam Report</h1>
                    <p className="text-muted-foreground">
                        The exam report could not be loaded for this exam.
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/exams">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Exams
                    </Link>
                </Button>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground text-sm">
                        Try refreshing the report. If the issue persists, the exam may not be
                        available in your current scope.
                    </p>
                    <Button className="mt-4" onClick={() => refetch()}>
                        Retry Report
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
