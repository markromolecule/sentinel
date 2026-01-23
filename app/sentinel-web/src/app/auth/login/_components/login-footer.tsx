import Link from "next/link";

export function LoginFooter() {
    return (
        <div className="text-center text-sm text-gray-400 mt-0">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Sign up
            </Link>
        </div>
    );
}
