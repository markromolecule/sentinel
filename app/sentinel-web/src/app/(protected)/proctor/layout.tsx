import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ProctorSidebar, ProctorHeader } from "@/components/protected/proctor/proctor-sidebar";

export default function ProctorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <ProctorSidebar />
            <SidebarInset>
                <ProctorHeader />
                <main className="flex-1 p-6">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
