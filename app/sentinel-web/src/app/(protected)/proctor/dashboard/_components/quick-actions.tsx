"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

export function QuickActions() {
    return (
        <Card className="p-6 border-border/50">
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
                <Button asChild className="h-auto py-4 flex-col gap-2 bg-[#323d8f] hover:bg-[#323d8f]/90">
                    <Link href="/proctor/exams">
                        <Plus className="w-5 h-5" />
                        <span>Create Exam</span>
                    </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <Link href="/proctor/students">
                        <Users className="w-5 h-5" />
                        <span>Add Students</span>
                    </Link>
                </Button>
            </div>
        </Card>
    );
}
