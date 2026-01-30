"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DashboardStatsProps } from "@/app/(protected)/proctor/dashboard/_types";

export function DashboardStats({ stats }: DashboardStatsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
                <Link key={stat.label} href={stat.href}>
                    <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-border/50">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                            </div>
                        </div>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
