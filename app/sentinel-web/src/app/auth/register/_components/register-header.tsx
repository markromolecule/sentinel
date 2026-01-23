import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function RegisterHeader() {
    return (
        <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
            <CardDescription className="text-center text-gray-400">
                Enter your information to get started with Sentinel
            </CardDescription>
        </CardHeader>
    );
}
