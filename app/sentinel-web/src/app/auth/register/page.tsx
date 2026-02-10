'use client';

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { RegisterHeader } from "@/app/auth/register/_components/register-header";
import { RegisterForm } from "@/app/auth/register/_components/register-form";
import { SocialLogin } from "@/app/auth/register/_components/social-login";
import { RegisterFooter } from "@/app/auth/register/_components/register-footer";
import { useRegisterForm } from "@/app/auth/register/_hooks/use-register-form";

export default function RegisterPage() {
    const {
        form,
        authError,
        successMessage,
        isLoading,
        onSubmit
    } = useRegisterForm();

    return (
        <Card className="bg-[#131315] border-white/10 text-white w-full shadow-2xl gap-0">
            <RegisterHeader />
            <CardContent className="space-y-4 p-4 sm:p-6 sm:pb-4">
                <RegisterForm
                    form={form}
                    authError={authError}
                    successMessage={successMessage}
                    isLoading={isLoading}
                    onSubmit={onSubmit}
                />
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-0">
                <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/5" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#131315] px-2 text-gray-500 font-medium tracking-wider">Or continue with</span>
                    </div>
                </div>
                <SocialLogin />
                <RegisterFooter />
            </CardFooter>
        </Card>
    );
}
