export type TargetAudience = "all" | "students" | "proctors" | "specific_group";

export interface AdminEvent {
    id: string;
    date: Date;
    title: string;
    description: string;
    type: "event" | "announcement" | "maintenance";
    targetAudience: TargetAudience;
    startTime?: string;
    endTime?: string;
    createdBy: string;
}

export interface CalendarDay {
    date: Date;
    events: AdminEvent[];
    isCurrentMonth: boolean;
    isToday: boolean;
}
