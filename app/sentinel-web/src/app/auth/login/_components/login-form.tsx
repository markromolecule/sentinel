import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { LoginSchemaType } from "@sentinel/shared";
import { UseFormReturn } from "react-hook-form";

interface LoginFormProps {
    form: UseFormReturn<LoginSchemaType>;
    authError: string | null;
    isLoading: boolean;
    onSubmit: () => void;
}

export function LoginForm({ form, authError, isLoading, onSubmit }: LoginFormProps) {
    const { register, formState: { errors } } = form;

    return (
        <div className="space-y-4">
            {/* Auth Error Display */}
            {authError && (
                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
                    <p className="text-sm font-medium text-red-500">
                        {authError}
                    </p>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="email" className={errors.email ? "text-red-500" : ""}>Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="doe@example.com"
                    className={`bg-[#0f0f10] border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    disabled={isLoading}
                    {...register("email")}
                />
                {errors.email && (
                    <p className="text-[0.8rem] font-medium text-red-500">
                        {errors.email.message}
                    </p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="password" className={errors.password ? "text-red-500" : ""}>Password</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className={`bg-[#0f0f10] border-white/10 text-white focus-visible:ring-blue-500 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    disabled={isLoading}
                    {...register("password")}
                />
                {errors.password && (
                    <p className="text-[0.8rem] font-medium text-red-500">
                        {errors.password.message}
                    </p>
                )}
                <div className="flex items-center justify-between pt-2 mb-8">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="remember"
                            className="border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                            onCheckedChange={(checked) => form.setValue("remember", checked as boolean)}
                            {...register("remember")}
                        />
                        <label
                            htmlFor="remember"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-400"
                        >
                            Remember me
                        </label>
                    </div>
                    <Link
                        href="#"
                        className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Forgot password?
                    </Link>
                </div>
            </div>

            <Button
                className="w-full h-12 text-base font-semibold group"
                variant="premium-3d"
                size="lg"
                onClick={onSubmit}
                disabled={isLoading}
            >
                {isLoading ? "Signing in..." : "Sign in"}
                {!isLoading && <ArrowRight className="w-5 h-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />}
            </Button>
        </div>
    );
}
