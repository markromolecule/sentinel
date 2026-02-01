import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemStat } from "@/app/(protected)/admin/_types";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface AdminStatsCardsProps {
    stats: SystemStat[];
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {stat.label}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className="text-xs text-muted-foreground flex items-center pt-1">
                            {stat.change !== undefined && (
                                <span
                                    className={`flex items-center mr-1 ${stat.trend === "up"
                                        ? "text-green-500"
                                        : stat.trend === "down"
                                            ? "text-red-500"
                                            : "text-muted-foreground"
                                        }`}
                                >
                                    {stat.trend === "up" && <ArrowUp className="h-3 w-3 mr-1" />}
                                    {stat.trend === "down" && (
                                        <ArrowDown className="h-3 w-3 mr-1" />
                                    )}
                                    {stat.trend === "neutral" && (
                                        <Minus className="h-3 w-3 mr-1" />
                                    )}
                                    {Math.abs(stat.change)}%
                                </span>
                            )}
                            {stat.description}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
