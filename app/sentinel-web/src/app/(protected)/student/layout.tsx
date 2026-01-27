import StudentHeader from "@/components/protected/student/StudentHeader";
import StudentBottomNav from "@/components/protected/student/StudentBottomNav";
import StudentFooter from "@/components/protected/student/StudentFooter";

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#0f0f10] flex flex-col pb-20 md:pb-0">
            <StudentHeader />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
                {children}
            </main>
            <StudentFooter />
            <StudentBottomNav />
        </div>
    );
}
