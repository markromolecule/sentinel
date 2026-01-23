import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function LoginHeader() {
    return (
        <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
            <CardDescription className="text-center text-gray-400">
                Enter your email to sign in to your account
            </CardDescription>
        </CardHeader>
    );
}
