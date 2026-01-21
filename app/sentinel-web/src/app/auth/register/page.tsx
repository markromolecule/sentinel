'use client';

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useSignUpMutation } from "@/hooks/query/auth/use-sign-up-mutation";
import { useGoogleLogin } from "@/hooks/query/auth/use-google-login";

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [errors, setErrors] = useState({
        firstName: false,
        lastName: false,
        email: false,
        password: false,
        confirmPassword: false
    });

    const handleBlur = (field: keyof typeof formData) => {
        if (!formData[field].trim()) {
            setErrors(prev => ({ ...prev, [field]: true }));
        }
    };

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (value.trim()) {
            setErrors(prev => ({ ...prev, [field]: false }));
        }
    };

    const { loginWithGoogle, isLoading: isGoogleLoading } = useGoogleLogin();

    const { mutate: signUp, isPending: isLoading } = useSignUpMutation({
        onSuccess: () => {
            // Handle success (e.g., redirect or show success message)
            alert('Registration successful! Please check your email to verify your account.')
        },
        onError: (error) => {
            alert(error.message)
        }
    })

    const handleSubmit = () => {
        // Validate fields
        const newErrors = { ...errors };
        let hasError = false;

        Object.keys(formData).forEach((key) => {
            const field = key as keyof typeof formData;
            if (!formData[field].trim()) {
                newErrors[field] = true;
                hasError = true;
            }
        });

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = true;
            hasError = true;
            alert("Passwords do not match");
        }

        setErrors(newErrors);

        if (hasError) return;

        signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                }
            }
        });
    };

    return (
        <Card className="bg-[#131315] border-white/10 text-white w-full shadow-2xl">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
                <CardDescription className="text-center text-gray-400">
                    Enter your information to get started with Sentinel
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
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
                    />
                    {errors.confirmPassword && (
                        <p className="text-[0.8rem] font-medium text-red-500">
                            Please confirm your password
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
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
                <Button
                    className="w-full h-12 text-base font-semibold group"
                    variant="premium-3d"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? "Creating account..." : "Create account"}
                    {!isLoading && <ArrowUpRight className="w-5 h-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />}
                </Button>

                <div className="relative w-full py-2">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/5" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#131315] px-2 text-gray-500 font-medium tracking-wider">Or continue with</span>
                    </div>
                </div>

                <Button
                    variant="secondary-3d"
                    size="lg"
                    className="w-full h-12 flex items-center justify-center gap-3"
                    onClick={loginWithGoogle}
                    disabled={isGoogleLoading}
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    <span className="font-semibold">{isGoogleLoading ? 'Connecting...' : 'Continue with Google'}</span>
                </Button>

                <div className="text-center text-sm text-gray-400">
                    Already have an account?{" "}
                    <Link href="/auth/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                        Sign in
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}
