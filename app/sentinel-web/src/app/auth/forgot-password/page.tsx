'use client';

import { Card, CardContent } from '@sentinel/ui';
import { ForgotPasswordHeader } from './_components/forgot-password-header';
import { ForgotPasswordForm } from './_components/forgot-password-form';
import { ForgotPasswordConfirmation } from './_components/forgot-password-confirmation';
import { useForgotPasswordForm } from './_hooks/use-forgot-password-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const {
        form,
        authError,
        isLoading,
        isSubmitted,
        submittedEmail,
        onSubmit,
        handleResend,
    } = useForgotPasswordForm();

    return (
        <div className="animate-fade-in w-full transition-all duration-700">
            <Card className="group relative w-full gap-0 overflow-hidden border-white/[0.08] bg-[#131315]/40 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

                {/* Back to sign in button at top left of the card */}
                <div className="absolute top-4 left-4 z-20">
                    <Link
                        href="/auth/login"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400 backdrop-blur-sm transition-all hover:border-white/10 hover:bg-white/10 hover:text-white"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to sign in
                    </Link>
                </div>

                {!isSubmitted && <ForgotPasswordHeader />}
                
                <CardContent className="relative z-10 space-y-4 p-4 sm:p-6 sm:pb-8">
                    {isSubmitted ? (
                        <ForgotPasswordConfirmation
                            email={submittedEmail}
                            isLoading={isLoading}
                            onResend={handleResend}
                        />
                    ) : (
                        <ForgotPasswordForm
                            form={form}
                            authError={authError}
                            isLoading={isLoading}
                            onSubmit={onSubmit}
                        />
                    )}
                </CardContent>

                <div className="pointer-events-none absolute -right-24 -bottom-24 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl transition-all duration-1000 group-hover:bg-blue-600/20"></div>
            </Card>
        </div>
    );
}
