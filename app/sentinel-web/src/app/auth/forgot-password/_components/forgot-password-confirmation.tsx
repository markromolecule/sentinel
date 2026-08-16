import { Button } from '@sentinel/ui';
import { MailCheck, RotateCw } from 'lucide-react';

interface ForgotPasswordConfirmationProps {
    email: string;
    isLoading: boolean;
    onResend: () => void;
}

export function ForgotPasswordConfirmation({
    email,
    isLoading,
    onResend,
}: ForgotPasswordConfirmationProps) {
    return (
        <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 p-4 ring-1 ring-green-500/20">
                <MailCheck className="h-8 w-8 text-green-400" />
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-white">Check your email</h2>
                <p className="text-sm text-gray-400">
                    We have sent a password recovery link to{' '}
                    <span className="font-semibold text-white">{email}</span>.
                </p>
                <p className="text-xs text-gray-500">
                    Please check your inbox and spam folders. The link will expire shortly.
                </p>
            </div>

            <div className="space-y-4 pt-2">
                <Button
                    onClick={onResend}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full border-white/10 bg-[#0f0f10]/50 hover:bg-[#0f0f10] hover:text-white"
                >
                    <RotateCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Resending...' : 'Resend reset link'}
                </Button>
            </div>
        </div>
    );
}
