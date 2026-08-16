import { Input } from '@sentinel/ui';
import { Label } from '@sentinel/ui';
import { Button } from '@sentinel/ui';
import { ArrowRight } from 'lucide-react';
import { ForgotPasswordSchemaType } from '@sentinel/shared/schema';
import { UseFormReturn } from 'react-hook-form';

interface ForgotPasswordFormProps {
    form: UseFormReturn<ForgotPasswordSchemaType>;
    authError: string | null;
    isLoading: boolean;
    onSubmit: () => void;
}

export function ForgotPasswordForm({
    form,
    authError,
    isLoading,
    onSubmit,
}: ForgotPasswordFormProps) {
    const {
        register,
        formState: { errors },
    } = form;

    return (
        <form className="space-y-4" onSubmit={onSubmit}>
            {authError && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3">
                    <p className="text-sm font-medium text-red-500">{authError}</p>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="email" className={errors.email ? 'text-red-500' : ''}>
                    Email Address
                </Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="doe@example.com"
                    className={`border-white/10 bg-[#0f0f10] text-white placeholder:text-gray-500 focus-visible:ring-blue-500 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    disabled={isLoading}
                    {...register('email')}
                />
                {errors.email && (
                    <p className="text-[0.8rem] font-medium text-red-500">
                        {errors.email.message}
                    </p>
                )}
            </div>

            <Button
                className="group h-12 w-full text-base font-semibold"
                variant="premium-3d"
                size="lg"
                type="submit"
                disabled={isLoading}
            >
                {isLoading ? 'Sending link...' : 'Send Reset Link'}
                {!isLoading && (
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                )}
            </Button>

        </form>
    );
}
