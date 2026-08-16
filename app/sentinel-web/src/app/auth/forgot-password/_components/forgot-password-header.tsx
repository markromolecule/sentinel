import { CardHeader } from '@sentinel/ui';
import { KeyRound } from 'lucide-react';

export function ForgotPasswordHeader() {
    return (
        <CardHeader className="relative z-10 space-y-2 pt-14 pb-2 text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 p-4 ring-1 ring-blue-500/20">
                <KeyRound className="h-8 w-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                Forgot Password
            </h1>
            <p className="text-sm text-gray-400">
                Enter your registered email address and we'll send you a password reset link.
            </p>
        </CardHeader>
    );
}
