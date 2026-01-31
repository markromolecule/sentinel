import { FlaggedIncident } from "@/app/(protected)/admin/dashboard/_types";

export const MOCK_FLAGGED_INCIDENTS: FlaggedIncident[] = [
    {
        id: "INC-001",
        studentName: "Jamie Cook",
        examName: "CS101 Midterm",
        incidentType: "multiple_faces",
        severity: "high",
        timestamp: "2 mins ago",
        status: "pending"
    },
    {
        id: "INC-002",
        studentName: "Alex Turner",
        examName: "CS101 Midterm",
        incidentType: "tab_switch",
        severity: "medium",
        timestamp: "5 mins ago",
        status: "pending"
    },
    {
        id: "INC-003",
        studentName: "Maria Santos",
        examName: "Math 201 Final",
        incidentType: "face_not_visible",
        severity: "low",
        timestamp: "12 mins ago",
        status: "reviewed"
    },
    {
        id: "INC-004",
        studentName: "James Wilson",
        examName: "Physics 101",
        incidentType: "audio_detected",
        severity: "medium",
        timestamp: "18 mins ago",
        status: "pending"
    }
];

export const incidentLabels: Record<FlaggedIncident["incidentType"], string> = {
    face_not_visible: "Face Not Visible",
    multiple_faces: "Multiple Faces Detected",
    tab_switch: "Tab Switch Detected",
    audio_detected: "Audio Anomaly",
    suspicious_movement: "Suspicious Movement"
};