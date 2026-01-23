import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { RegisterFormData, RegisterFormErrors } from "../_types";

interface RegisterFormProps {
    formData: RegisterFormData;
    errors: RegisterFormErrors;
    authError: string | null;
    passwordMismatch: boolean;
    successMessage: string | null;
    isLoading: boolean;
    handleChange: (field: keyof RegisterFormData, value: string) => void;
    handleBlur: (field: keyof RegisterFormData) => void;
    handleSubmit: () => void;
}

export function RegisterForm({ formData, errors, authError, passwordMismatch, successMessage, isLoading, handleChange, handleBlur, handleSubmit }: RegisterFormProps) {
    return (
        <div className="space-y-4">
            {/* Success Message */}
            {successMessage && (
                <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-sm font-medium text-green-500">
                        {successMessage}
                    </p>
                </div>
            )}

            {/* Auth Error Display */}
            {authError && (
                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
                    <p className="text-sm font-medium text-red-500">
                        {authError}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName" className={errors.firstName ? "text-red-500" : ""}>First name</Label>
                    <Input
                        id="firstName"
                        placeholder="John"
                        className={`bg-[#0f0f10] border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500 ${errors.firstName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        value={formData.firstName}
                        onChange={(e) => handleChange("firstName", e.target.value)}
                        onBlur={() => handleBlur("firstName")}
                        disabled={isLoading}
                    />
                    {errors.firstName && (
                        <p className="text-[0.8rem] font-medium text-red-500">
                            First name is required
                        </p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName" className={errors.lastName ? "text-red-500" : ""}>Last name</Label>
                    <Input
                        id="lastName"
                        placeholder="Doe"
                        className={`bg-[#0f0f10] border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500 ${errors.lastName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        value={formData.lastName}
                        onChange={(e) => handleChange("lastName", e.target.value)}
                        onBlur={() => handleBlur("lastName")}
                        disabled={isLoading}
                    />
                    {errors.lastName && (
                        <p className="text-[0.8rem] font-medium text-red-500">
                            Last name is required
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email" className={errors.email ? "text-red-500" : ""}>Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="doe@example.com"
                    className={`bg-[#0f0f10] border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    disabled={isLoading}
                />
                {errors.email && (
                    <p className="text-[0.8rem] font-medium text-red-500">
                        Email is required
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
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    onBlur={() => handleBlur("password")}
                    disabled={isLoading}
                />
                {errors.password && (
                    <p className="text-[0.8rem] font-medium text-red-500">
                        Password is required
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirmPassword" className={errors.confirmPassword ? "text-red-500" : ""}>Confirm Password</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    className={`bg-[#0f0f10] border-white/10 text-white focus-visible:ring-blue-500 ${errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    onBlur={() => handleBlur("confirmPassword")}
                    disabled={isLoading}
                />
                {errors.confirmPassword && (
                    <p className="text-[0.8rem] font-medium text-red-500">
                        {passwordMismatch ? "Passwords do not match" : "Please confirm your password"}
                    </p>
                )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="terms" className="border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
                <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none text-gray-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    I agree to the <Link href="#" className="text-blue-400 hover:underline">Terms of Service</Link> and <Link href="#" className="text-blue-400 hover:underline">Privacy Policy</Link>
                </label>
            </div>

            <Button
                className="w-full h-12 text-base font-semibold group mt-2"
                variant="premium-3d"
                size="lg"
                onClick={handleSubmit}
                disabled={isLoading}
            >
                {isLoading ? "Creating account..." : "Create account"}
                {!isLoading && <ArrowUpRight className="w-5 h-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />}
            </Button>
        </div>
    );
}
