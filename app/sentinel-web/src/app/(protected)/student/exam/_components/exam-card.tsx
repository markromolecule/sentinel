"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { type Exam } from "@/app/(protected)/student/_types";

interface ExamCardProps {
    exam: Exam;
}

export function ExamCard({ exam }: ExamCardProps) {
    return (
        <Card className="group bg-[#1a1b26] border-white/5 hover:border-[#323d8f]/50 transition-all duration-300 overflow-hidden flex flex-col h-full">
            {/* Card Cover / Top Decoration */}
            <div className="h-32 bg-gradient-to-br from-[#323d8f]/20 to-[#4a5bb8]/10 relative">
                <div className="absolute top-4 right-4">
                    <Badge className={cn(
                        "capitalize shadow-sm",
                        exam.status === 'available' ? 'bg-[#323d8f] text-white hover:bg-[#323d8f]' :
                            exam.status === 'upcoming' ? 'bg-amber-500 text-white hover:bg-amber-600' :
                                'bg-white/10 text-white hover:bg-white/20'
                    )}>
                        {exam.status}
                    </Badge>
                </div>
            </div>

            <CardHeader className="pb-0 pt-4 px-5">
                <CardTitle className="text-xl text-white line-clamp-1 group-hover:text-[#323d8f] transition-colors">
                    {exam.title}
                </CardTitle>
                <CardDescription className="text-white/60 line-clamp-1">
                    {exam.subject}
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-between gap-4 px-5 pb-5 pt-4">
                <div className="space-y-2">
                    <div className="flex items-center text-sm text-white/50">
                        <Clock className="w-4 h-4 mr-2 text-[#323d8f]/70" />
                        {exam.duration} minutes
                    </div>
                    <div className="flex items-center text-sm text-white/50">
                        <User className="w-4 h-4 mr-2 text-[#323d8f]/70" />
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
