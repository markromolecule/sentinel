import Sidebar from "@/components/protected/Sidebar"

export default function ProctorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex">
            <Sidebar />
            <main className="flex-1 p-4">
                {children}
            </main>
        </div>
    )
}
