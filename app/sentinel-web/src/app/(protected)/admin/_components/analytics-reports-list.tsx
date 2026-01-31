"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileBarChart, Loader2 } from "lucide-react";
import { AnalyticsReport } from "../_types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface AnalyticsReportsListProps {
    reports: AnalyticsReport[];
}

export function AnalyticsReportsList({ reports }: AnalyticsReportsListProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                    <CardTitle>Available Reports</CardTitle>
                    <CardDescription>
                        Download administrative reports on system usage and exam integrity.
                    </CardDescription>
                </div>
                <Button>
                    <FileBarChart className="mr-2 h-4 w-4" />
                    Generate New Report
                </Button>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Report Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Generated At</TableHead>
                                <TableHead>Format</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell className="font-medium">{report.title}</TableCell>
                                    <TableCell className="capitalize">{report.type}</TableCell>
                                    <TableCell>{report.generatedAt}</TableCell>
                                    <TableCell className="uppercase">{report.format}</TableCell>
                                    <TableCell className="text-right">
                                        {report.status === "ready" ? (
                                            <Button variant="ghost" size="sm">
                                                <Download className="mr-2 h-4 w-4" />
                                                Download
                                            </Button>
                                        ) : report.status === "generating" ? (
                                            <Button variant="ghost" size="sm" disabled>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Generating...
                                            </Button>
                                        ) : (
                                            <Badge variant="destructive">Failed</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
