"use client";

import { useState } from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    isToday,
    addMonths,
    subMonths,
} from "date-fns";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { MOCK_PROCTOR_EXAMS } from "../_constants";

// Helper to convert exam to calendar event format
const getCalendarEvents = () => {
    return MOCK_PROCTOR_EXAMS.filter(exam => exam.scheduledDate).map(exam => ({
        id: exam.id,
        title: exam.title,
        date: new Date(exam.scheduledDate!),
        type: 'exam',
        description: exam.description,
        duration: exam.duration,
        studentsCount: exam.studentsCount
    }));
};

export default function ProctorCalendarPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const events = getCalendarEvents();

    // Calendar Logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        setIsDetailsOpen(true);
    };

    const getEventsForDate = (date: Date) => {
        return events.filter((event) => isSameDay(event.date, date));
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
                    <p className="text-muted-foreground">
                        View your scheduled examinations.
                    </p>
                </div>
                <div className="flex items-center border rounded-md bg-card">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePreviousMonth}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="px-4 font-semibold min-w-[140px] text-center">
                        {format(currentMonth, "MMMM yyyy")}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNextMonth}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1 flex flex-col">
                    <div className="min-w-[800px] flex-1 flex flex-col">
                        {/* Days Header */}
                        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
                            {weekDays.map((day) => (
                                <div
                                    key={day}
                                    className="py-3 text-center text-sm font-medium text-muted-foreground"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-background">
                            {calendarDays.map((day) => {
                                const dayEvents = getEventsForDate(day);
                                const isCurrentMonth =
                                    format(day, "M") === format(currentMonth, "M");

                                return (
                                    <div
                                        key={day.toString()}
                                        onClick={() => handleDayClick(day)}
                                        className={cn(
                                            "min-h-[100px] p-2 border-b border-r border-border/50 transition-colors cursor-pointer hover:bg-muted/30 relative group",
                                            !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                                            isToday(day) && "bg-primary/5"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span
                                                className={cn(
                                                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                                                    isToday(day)
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                {format(day, "d")}
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            {dayEvents.slice(0, 3).map(event => (
                                                <div key={event.id} className="text-[10px] px-1.5 py-0.5 rounded border truncate font-medium bg-primary/10 text-primary border-primary/20">
                                                    {event.title}
                                                </div>
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <div className="text-[10px] text-muted-foreground pl-1">
                                                    +{dayEvents.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
                        </SheetTitle>
                        <SheetDescription>
                            scheduled exams for this day.
                        </SheetDescription>
                    </SheetHeader>

                    {selectedDate && (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                {getEventsForDate(selectedDate).length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                        No exams scheduled
                                    </div>
                                ) : (
                                    getEventsForDate(selectedDate).map((event) => (
                                        <div key={event.id} className="p-4 rounded-lg bg-card border shadow-sm">
                                            <h3 className="font-semibold text-base mb-1">{event.title}</h3>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {event.duration} mins
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {event.studentsCount} students
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {event.description}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
