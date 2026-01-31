"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "@/app/(protected)/admin/_types";
import { Badge } from "@/components/ui/badge";

interface SystemHealthProps {
    recentActivity: Activity[];
}

export function SystemHealth({ recentActivity }: SystemHealthProps) {
    const getBadgeVariant = (type: Activity["type"]) => {
        switch (type) {
            case "success":
                return "default";
            case "warning":
                return "secondary";
            case "error":
                return "destructive";
            default:
                return "outline";
        }
    };

    return (
        <div className="space-y-4">
            <Card>
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
        </div>
    );
}
