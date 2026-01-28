"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Search,
    Eye,
    EyeOff,
    Volume2,
    VolumeX,
    MonitorOff,
    Camera,
    AlertTriangle,
    CheckCircle,
    Clock,
    Users,
    MoreHorizontal,
    RefreshCw,
    Maximize2,
    Filter,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mock data for monitoring
const MOCK_EXAM = {
    id: "1",
    title: "Data Structures Midterm",
    subject: "Data Structures",
    duration: 120,
    startedAt: "2026-01-28T14:00:00",
    endsAt: "2026-01-28T16:00:00",
};

type FlagType = "tab_switch" | "gaze" | "audio" | "screenshot";

type Flag = {
    id: string;
    type: FlagType;
    timestamp: string;
    description: string;
    severity: "low" | "medium" | "high";
    snapshotUrl?: string;
};

type StudentSession = {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    status: "active" | "submitted" | "flagged" | "disconnected";
    progress: number;
    flags: Flag[];
    lastActivity: string;
};

const MOCK_STUDENTS: StudentSession[] = [
    {
        id: "1",
        studentNo: "2024-00123",
        firstName: "Juan",
        lastName: "Dela Cruz",
        status: "active",
        progress: 65,
        lastActivity: "2 min ago",
        flags: [],
    },
    {
        id: "2",
        studentNo: "2024-00124",
        firstName: "Maria",
        lastName: "Garcia",
        status: "flagged",
        progress: 45,
        lastActivity: "Just now",
        flags: [
            {
                id: "f1",
                type: "tab_switch",
                timestamp: "2026-01-28T14:32:00",
                description: "Switched to another browser tab",
                severity: "medium",
            },
            {
                id: "f2",
                type: "gaze",
                timestamp: "2026-01-28T14:35:00",
                description: "Looking away from screen for 8 seconds",
                severity: "high",
                snapshotUrl: "/placeholder-snapshot.jpg",
            },
        ],
    },
    {
        id: "3",
        studentNo: "2024-00125",
        firstName: "Pedro",
        lastName: "Reyes",
        status: "active",
        progress: 80,
        lastActivity: "1 min ago",
        flags: [
            {
                id: "f3",
                type: "audio",
                timestamp: "2026-01-28T14:28:00",
                description: "Background voices detected",
                severity: "low",
            },
        ],
    },
    {
        id: "4",
        studentNo: "2024-00126",
        firstName: "Ana",
        lastName: "Santos",
        status: "submitted",
        progress: 100,
        lastActivity: "15 min ago",
        flags: [],
    },
    {
        id: "5",
        studentNo: "2024-00127",
        firstName: "Carlos",
        lastName: "Mendoza",
        status: "disconnected",
        progress: 30,
        lastActivity: "5 min ago",
        flags: [
            {
                id: "f4",
                type: "tab_switch",
                timestamp: "2026-01-28T14:40:00",
                description: "Multiple tab switches detected (3x)",
                severity: "high",
            },
        ],
    },
];

const flagIcons: Record<FlagType, React.ReactNode> = {
    tab_switch: <MonitorOff className="w-4 h-4" />,
    gaze: <EyeOff className="w-4 h-4" />,
    audio: <VolumeX className="w-4 h-4" />,
    screenshot: <Camera className="w-4 h-4" />,
};

const flagLabels: Record<FlagType, string> = {
    tab_switch: "Tab Switch",
    gaze: "Gaze Detection",
    audio: "Audio Alert",
    screenshot: "Snapshot Taken",
};

const severityColors: Record<string, string> = {
    low: "bg-yellow-100 text-yellow-700 border-yellow-200",
    medium: "bg-orange-100 text-orange-700 border-orange-200",
    high: "bg-red-100 text-red-700 border-red-200",
};

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    active: { color: "bg-emerald-100 text-emerald-700", icon: <Eye className="w-3 h-3" />, label: "Active" },
    submitted: { color: "bg-blue-100 text-blue-700", icon: <CheckCircle className="w-3 h-3" />, label: "Submitted" },
    flagged: { color: "bg-red-100 text-red-700", icon: <AlertTriangle className="w-3 h-3" />, label: "Flagged" },
    disconnected: { color: "bg-gray-100 text-gray-700", icon: <Clock className="w-3 h-3" />, label: "Disconnected" },
};

export default function ExamMonitoringPage() {
    const params = useParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<StudentSession | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("all");

    const filteredStudents = MOCK_STUDENTS.filter((student) => {
        const matchesSearch =
            student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.studentNo.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === "all" || student.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: MOCK_STUDENTS.length,
        active: MOCK_STUDENTS.filter((s) => s.status === "active").length,
        flagged: MOCK_STUDENTS.filter((s) => s.status === "flagged").length,
        submitted: MOCK_STUDENTS.filter((s) => s.status === "submitted").length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/proctor/exams">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-foreground">{MOCK_EXAM.title}</h1>
                        <p className="text-muted-foreground text-sm">Live Monitoring • {MOCK_EXAM.subject}</p>
                    </div>
                    <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {/* Stats Bar */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Total:</span>
                        <span className="font-semibold text-foreground">{stats.total}</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-sm text-muted-foreground">Active:</span>
                        <span className="font-semibold text-foreground">{stats.active}</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-sm text-muted-foreground">Flagged:</span>
                        <span className="font-semibold text-foreground">{stats.flagged}</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-sm text-muted-foreground">Submitted:</span>
                        <span className="font-semibold text-foreground">{stats.submitted}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Student List */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search and Filter */}
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Filter className="w-4 h-4 mr-2" />
                                    {filterStatus === "all" ? "All Status" : statusConfig[filterStatus]?.label}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setFilterStatus("all")}>All Status</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus("active")}>Active</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus("flagged")}>Flagged</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus("submitted")}>Submitted</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus("disconnected")}>Disconnected</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Students Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredStudents.map((student) => (
                            <Card
                                key={student.id}
                                className={cn(
                                    "p-4 cursor-pointer transition-all hover:shadow-md border-border/50",
                                    selectedStudent?.id === student.id && "ring-2 ring-[#323d8f]"
                                )}
                                onClick={() => setSelectedStudent(student)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] flex items-center justify-center text-white text-sm font-bold">
                                            {student.firstName[0]}{student.lastName[0]}
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {student.firstName} {student.lastName}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono">{student.studentNo}</p>
                                        </div>
                                    </div>
                                    <Badge className={cn("text-xs", statusConfig[student.status].color)}>
                                        {statusConfig[student.status].icon}
                                        <span className="ml-1">{statusConfig[student.status].label}</span>
                                    </Badge>
                                </div>

                                {/* Progress */}
                                <div className="mb-3">
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-medium text-foreground">{student.progress}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#323d8f] rounded-full transition-all"
                                            style={{ width: `${student.progress}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Flags Summary */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {student.flags.length > 0 ? (
                                            <>
                                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                                <span className="text-sm text-red-600 font-medium">
                                                    {student.flags.length} flag{student.flags.length !== 1 ? "s" : ""}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                <span className="text-sm text-emerald-600">No flags</span>
                                            </>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{student.lastActivity}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Detail Panel */}
                <div className="space-y-4">
                    {selectedStudent ? (
                        <>
                            {/* Student Info */}
                            <Card className="p-4 border-border/50">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-foreground">Student Details</h3>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>
                                                <Camera className="w-4 h-4 mr-2" />
                                                Take Snapshot
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <Maximize2 className="w-4 h-4 mr-2" />
                                                View Fullscreen
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] flex items-center justify-center text-white text-lg font-bold">
                                        {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground text-lg">
                                            {selectedStudent.firstName} {selectedStudent.lastName}
                                        </p>
                                        <p className="text-sm text-muted-foreground font-mono">{selectedStudent.studentNo}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge className={cn("text-xs", statusConfig[selectedStudent.status].color)}>
                                            {statusConfig[selectedStudent.status].label}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-medium">{selectedStudent.progress}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Last Activity</span>
                                        <span className="font-medium">{selectedStudent.lastActivity}</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Snapshot Preview Placeholder */}
                            <Card className="p-4 border-border/50">
                                <h3 className="font-semibold text-foreground mb-3">Live Preview</h3>
                                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-dashed border-border">
                                    <div className="text-center">
                                        <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">Webcam preview</p>
                                        <p className="text-xs text-muted-foreground">(Coming soon)</p>
                                    </div>
                                </div>
                                <Button className="w-full mt-3 bg-[#323d8f] hover:bg-[#323d8f]/90" size="sm">
                                    <Camera className="w-4 h-4 mr-2" />
                                    Take Snapshot
                                </Button>
                            </Card>

                            {/* Flagging Events */}
                            <Card className="p-4 border-border/50">
                                <h3 className="font-semibold text-foreground mb-3">
                                    Flagging Events ({selectedStudent.flags.length})
                                </h3>
                                {selectedStudent.flags.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedStudent.flags.map((flag) => (
                                            <div
                                                key={flag.id}
                                                className={cn(
                                                    "p-3 rounded-lg border",
                                                    severityColors[flag.severity]
                                                )}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="p-1.5 rounded-md bg-white/50">
                                                        {flagIcons[flag.type]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-medium text-sm">
                                                                {flagLabels[flag.type]}
                                                            </span>
                                                            <span className="text-xs opacity-75">
                                                                {new Date(flag.timestamp).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm opacity-90">{flag.description}</p>
                                                        {flag.snapshotUrl && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="mt-2 h-7 text-xs bg-white/50"
                                                            >
                                                                <Eye className="w-3 h-3 mr-1" />
                                                                View Snapshot
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">No flagging events</p>
                                    </div>
                                )}
                            </Card>
                        </>
                    ) : (
                        <Card className="p-8 border-border/50">
                            <div className="text-center">
                                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                <h3 className="font-semibold text-foreground mb-1">Select a Student</h3>
                                <p className="text-sm text-muted-foreground">
                                    Click on a student card to view their details and flagging events
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
