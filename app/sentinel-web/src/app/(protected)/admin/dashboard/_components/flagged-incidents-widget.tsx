"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { FlaggedIncident } from "@/app/(protected)/admin/dashboard/_types";
import { MOCK_FLAGGED_INCIDENTS, incidentLabels } from "@/app/(protected)/admin/dashboard/_constants";

export function FlaggedIncidentsWidget() {


    const getSeverityBadge = (severity: FlaggedIncident["severity"]) => {
        switch (severity) {
            case "high":
                return <Badge variant="destructive" className="px-1.5 py-0 text-[10px] h-5">High</Badge>;
            case "medium":
                return <Badge className="bg-orange-500 hover:bg-orange-600 px-1.5 py-0 text-[10px] h-5">Medium</Badge>;
            case "low":
                return <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5">Low</Badge>;
        }
    };

    const pendingCount = MOCK_FLAGGED_INCIDENTS.filter(i => i.status === "pending").length;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h3 className="text-sm font-semibold">Flagged Incidents</h3>
                </div>
                <Badge variant="destructive" className="text-xs h-5">
                    {pendingCount} Pending
                </Badge>
            </CardHeader>
            <CardContent className="py-0 px-0">
                <div className="divide-y">
                    {MOCK_FLAGGED_INCIDENTS.map((incident) => (
                        <div key={incident.id} className="flex items-center justify-between p-3 text-sm hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{incident.studentName}</span>
                                        {getSeverityBadge(incident.severity)}
                                    </div>
                                    <div className="flex items-center gap-3 text-muted-foreground text-xs">
                                        <span>{incidentLabels[incident.incidentType]}</span>
                                        <span>•</span>
                                        <span>{incident.examName}</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {incident.timestamp}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 text-xs">
                                        <Eye className="h-3 w-3 mr-1" />
                                        Review
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Incident Review</DialogTitle>
                                        <DialogDescription>
                                            Review the flagged activity for {incident.studentName}.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-muted-foreground uppercase font-semibold">Violation Type</span>
                                                <span className="text-sm font-medium flex items-center gap-2">
                                                    {incidentLabels[incident.incidentType]}
                                                    {getSeverityBadge(incident.severity)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1 text-right">
                                                <span className="text-xs text-muted-foreground uppercase font-semibold">Timestamp</span>
                                                <span className="text-sm font-medium">{incident.timestamp}</span>
                                            </div>
                                        </div>

                                        <div className="aspect-video bg-muted rounded-lg border flex items-center justify-center relative overflow-hidden group">
                                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                                                <AlertTriangle className="h-8 w-8 opacity-50" />
                                                <span className="text-xs">Snapshot Evidence Placeholder</span>
                                            </div>
                                            {/* Mock overlay for multiple faces */}
                                            {incident.incidentType === "multiple_faces" && (
                                                <div className="absolute inset-0 bg-red-500/10 border-4 border-red-500/50" />
                                            )}
                                        </div>

                                        <div className="text-sm text-muted-foreground">
                                            <p>Session ID: <span className="font-mono text-xs">SES-{incident.id.split('-')[1]}</span></p>
                                        </div>
                                    </div>
                                    <DialogFooter className="gap-2 sm:gap-0">
                                        <Button variant="outline" onClick={() => console.log("Dismissed")}>Dismiss as False Positive</Button>
                                        <Button variant="destructive" onClick={() => console.log("Confirmed")}>Confirm Violation</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
