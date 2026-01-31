import { addDays, setHours, setMinutes } from "date-fns";
import { AdminEvent } from "../_types";

const today = new Date();

export const MOCK_ADMIN_EVENTS: AdminEvent[] = [
    {
        id: "evt-1",
        date: today,
        title: "System Maintenance",
        description: "Scheduled maintenance for server upgrades.",
        type: "maintenance",
        targetAudience: "all",
        startTime: "22:00",
        endTime: "23:00",
        createdBy: "admin-1",
    },
    {
        id: "evt-2",
        date: addDays(today, 2),
        title: "Proctor Orientation",
        description: "Mandatory session for new proctors.",
        type: "event",
        targetAudience: "proctors",
        startTime: "10:00",
        endTime: "12:00",
        createdBy: "admin-1",
    },
    {
        id: "evt-3",
        date: addDays(today, 5),
        title: "Exam Week Kickoff",
        description: "Start of the final exam period.",
        type: "announcement",
        targetAudience: "students",
        startTime: "09:00",
        createdBy: "admin-1",
    },
];
