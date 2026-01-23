import Link from "next/link";
import { CardFooter } from "@/components/ui/card";

export function RegisterFooter() {
    return (
        <div className="text-center text-sm text-gray-400 mt-0">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Sign in
            </Link>
        </div>
    );
}
