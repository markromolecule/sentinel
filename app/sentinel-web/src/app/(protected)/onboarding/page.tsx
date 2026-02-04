'use client';

import { OnboardingForm } from "@/app/(protected)/onboarding/_components/onboarding-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPage() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <Card className="w-full max-w-md bg-[#131315] border-white/10 text-white relative z-10 shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Complete your profile
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                        Please provide your student details to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <OnboardingForm />
                </CardContent>
            </Card>
        </div>
    );
}
