import { useState } from 'react';
import { Input, Checkbox } from '@sentinel/ui';
import { Label } from '@sentinel/ui';
import { Button } from '@sentinel/ui';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { LoginSchemaType } from '@sentinel/shared/schema';
import { UseFormReturn } from 'react-hook-form';

interface LoginFormProps {
    form: UseFormReturn<LoginSchemaType>;
    authError: string | null;
    isLoading: boolean;
    onSubmit: () => void;
}

export function LoginForm({ form, authError, isLoading, onSubmit }: LoginFormProps) {
    const [showPassword, setShowPassword] = useState(false);
    const {
        register,
        formState: { errors },
    } = form;

    return (
        <form className="space-y-4" onSubmit={onSubmit}>
            {/* Auth Error Display */}
            {authError && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3">
                    <p className="text-sm font-medium text-red-500">{authError}</p>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="email" className={errors.email ? 'text-red-500' : ''}>
                    Email
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
                    <p className="text-[0.8rem] font-medium text-red-500">{errors.email.message}</p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="password" className={errors.password ? 'text-red-500' : ''}>
                    Password
                </Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        className={`border-white/10 bg-[#0f0f10] pr-10 text-white focus-visible:ring-blue-500 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        disabled={isLoading}
                        {...register('password')}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 transition-colors hover:text-white"
                        aria-label="Toggle password visibility"
                        disabled={isLoading}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>
                {errors.password && (
                    <p className="text-[0.8rem] font-medium text-red-500">
                        {errors.password.message}
                    </p>
                )}
                <div className="mb-8 flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="remember"
                            onCheckedChange={(checked) =>
                                form.setValue('remember', checked as boolean)
                            }
                            {...register('remember')}
                        />
                        <label
                            htmlFor="remember"
                            className="cursor-pointer text-sm leading-none font-medium text-gray-300 select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Remember me
                        </label>
                    </div>
                    <Link
                        href="#"
                        className="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
                    >
                        Forgot password?
                    </Link>
                </div>
            </div>

            <Button
                className="group h-12 w-full text-base font-semibold"
                variant="premium-3d"
                size="lg"
                type="submit"
                disabled={isLoading}
            >
                {isLoading ? 'Signing in...' : 'Sign in'}
                {!isLoading && (
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                )}
            </Button>
        </form>
    );
}
