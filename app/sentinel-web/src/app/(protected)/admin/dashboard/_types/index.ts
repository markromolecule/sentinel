export type FlaggedIncident = {
    id: string;
    studentName: string;
    examName: string;
    incidentType: "face_not_visible" | "multiple_faces" | "tab_switch" | "audio_detected" | "suspicious_movement";
    severity: "high" | "medium" | "low";
    timestamp: string;
    status: "pending" | "reviewed" | "resolved";
};
