"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "../_types";
import { Badge } from "@/components/ui/badge";

interface SystemHealthProps {
    recentActivity: Activity[];
}

export function SystemHealth({ recentActivity }: SystemHealthProps) {
    const getBadgeVariant = (type: Activity["type"]) => {
        switch (type) {
            case "success":
                return "default"; // green/primary
            case "warning":
                return "secondary"; // yellow/secondary
            case "error":
                return "destructive"; // red
            default:
                return "outline";
        }
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Recent System Activity</CardTitle>
                    <CardDescription>
                        Latest actions and alerts across the platform.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        {recentActivity.map((activity) => (
                            <div key={activity.id} className="flex items-center">
                                <Badge
                                    className="mr-3 h-8 w-8 rounded-full flex items-center justify-center p-0"
                                    variant={getBadgeVariant(activity.type)}
                                >
                                    {activity.type[0].toUpperCase()}
                                </Badge>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {activity.user} {activity.action}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {activity.target} • {activity.timestamp}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>System Status</CardTitle>
                    <CardDescription>
                        Real-time operational metrics.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">CPU Usage</span>
                            <span className="text-sm text-muted-foreground">12%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary">
                            <div className="h-2 rounded-full bg-primary w-[12%]" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Memory Usage</span>
                            <span className="text-sm text-muted-foreground">48%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary">
                            <div className="h-2 rounded-full bg-primary w-[48%]" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Storage</span>
                            <span className="text-sm text-muted-foreground">23%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary">
                            <div className="h-2 rounded-full bg-primary w-[23%]" />
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Database Status</span>
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Operational</Badge>
                        </div>
                    </div>
                    <div className="pt-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">API Gateway</span>
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Operational</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
