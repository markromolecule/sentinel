"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ExamCardProps } from "@/app/(protected)/student/_types";

export function ExamCard({ exam }: ExamCardProps) {
    return (
        <Card className="group bg-card border-border/50 hover:border-primary/50 transition-all duration-300 overflow-hidden flex flex-col h-full">
            {/* Card Cover / Top Decoration */}
            <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/10 relative p-4 flex flex-col justify-between">
                <div className="absolute top-4 right-4">
                    <Badge className={cn(
                        "capitalize shadow-sm",
                        exam.status === 'available' ? 'bg-primary text-primary-foreground hover:bg-primary/90' :
                            exam.status === 'upcoming' ? 'bg-amber-500 text-white hover:bg-amber-600' :
                                'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}>
                        {exam.status}
                    </Badge>
                </div>

                <div className="mt-auto space-y-1">
                    <h3 className="text-xl font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {exam.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 font-medium">
                        {exam.subject}
                    </p>
                </div>
            </div>

            <CardContent className="flex-1 flex flex-col justify-between gap-4 px-5 pb-5 pt-4">
                <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2 text-primary/70" />
                        {exam.duration} minutes
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <User className="w-4 h-4 mr-2 text-primary/70" />
                        {exam.professor}
                    </div>
                </div>

                {exam.status === "upcoming" ? (
                    <Button
                        className="w-full mt-auto"
                        variant="outline"
                        disabled
                    >
                        Coming Soon
                    </Button>
                ) : (
                    <Link href={`/student/exam/details?id=${exam.id}`} className="w-full mt-auto">
                        <Button
                            className="w-full"
                            variant="outline"
                        >
                            View Details
                        </Button>
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}
