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
    subMonths
} from "date-fns";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    Calendar as CalendarIcon,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MOCK_EXAMS } from "../_constants";

type CustomNote = {
    id: string;
    date: Date;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
};

export default function StudentCalendarPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

    // Custom Notes State
    const [notes, setNotes] = useState<CustomNote[]>([]);

    // Note Form State
    const [noteTitle, setNoteTitle] = useState("");
    const [noteDesc, setNoteDesc] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

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

    // Handlers
    const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        setIsDetailsOpen(true);
    };

    const handleOpenAddNote = () => {
        setNoteTitle("");
        setNoteDesc("");
        setStartTime("");
        setEndTime("");
        setIsAddNoteOpen(true);
    };

    const handleSaveNote = () => {
        if (!selectedDate || !noteTitle) return;

        const newNote: CustomNote = {
            id: Math.random().toString(36).substr(2, 9),
            date: selectedDate,
            title: noteTitle,
            description: noteDesc,
            startTime,
            endTime
        };

        setNotes([...notes, newNote]);
        setIsAddNoteOpen(false);
    };

    const handleDeleteNote = (noteId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setNotes(notes.filter(n => n.id !== noteId));
    };

    // Get events for specific date
    const getEventsForDate = (date: Date) => {
        const exams = MOCK_EXAMS.filter(exam =>
            exam.scheduledDate && isSameDay(new Date(exam.scheduledDate), date)
        );
        const dateNotes = notes.filter(note => isSameDay(note.date, date));
        return { exams, notes: dateNotes };
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-24 md:pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#323d8f] to-[#4a5bb8] bg-clip-text text-transparent">Calendar</h1>
                    <p className="text-muted-foreground text-base md:text-lg">
                        Manage your schedule and personal reminders.
                    </p>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center justify-between md:justify-end gap-4 bg-card p-2 rounded-xl border border-border/50 w-full md:w-auto">
                    <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="text-foreground hover:bg-accent">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <span className="text-lg font-semibold text-foreground min-w-[140px] text-center">
                        {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth} className="text-foreground hover:bg-accent">
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Grid Calendar */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl">
                {/* Days Header */}
                <div className="grid grid-cols-7 border-b border-border bg-muted/50">
                    {weekDays.map((day) => (
                        <div key={day} className="py-3 md:py-4 text-center text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 auto-rows-fr bg-card">
                    {calendarDays.map((day, dayIdx) => {
                        const { exams, notes: dayNotes } = getEventsForDate(day);
                        const hasEvents = exams.length > 0 || dayNotes.length > 0;
                        const isCurrentMonth = format(day, 'M') === format(currentMonth, 'M');

                        return (
                            <div
                                key={day.toString()}
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                    "min-h-[80px] sm:min-h-[100px] md:min-h-[160px] p-1.5 md:p-3 border-b border-r border-border/50 relative group transition-all cursor-pointer",
                                    !isCurrentMonth ? "bg-muted/30 text-muted-foreground/50" : "text-foreground hover:bg-accent/30",
                                    isToday(day) && "bg-primary/5"
                                )}
                            >
                                {/* Date Number */}
                                <div className="flex justify-between items-start">
                                    <span className={cn(
                                        "text-xs md:text-sm font-medium w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full mb-1 md:mb-2",
                                        isToday(day) ? "bg-primary text-primary-foreground shadow-lg shadow-primary/40" : "text-muted-foreground"
                                    )}>
                                        {format(day, "d")}
                                    </span>

                                    {/* Mobile Dot Indicators */}
                                    <div className="flex md:hidden gap-1 mt-1.5">
                                        {exams.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                        {dayNotes.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                    </div>
                                </div>

                                {/* Desktop Content Container */}
                                <div className="hidden md:block space-y-1.5 overflow-y-auto max-h-[100px] pr-1 custom-scrollbar">
                                    {/* Exams */}
                                    {exams.map((exam) => (
                                        <div key={exam.id} className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 px-1.5 py-1 rounded-md line-clamp-1 font-medium flex items-center gap-1">
                                            <Clock className="w-3 h-3 flex-shrink-0" />
                                            {exam.title}
                                        </div>
                                    ))}

                                    {/* Notes */}
                                    {dayNotes.map((note) => (
                                        <div key={note.id} className="text-xs bg-primary/10 text-primary border border-primary/20 px-1.5 py-1 rounded-md font-medium group/note relative">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="line-clamp-1">{note.title}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Day Details Sheet (Mobile/Tablet Friendly) */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent side="right" className="bg-background border-border text-foreground w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="text-2xl font-bold flex items-center gap-2 text-foreground">
                            <CalendarIcon className="w-6 h-6 text-primary" />
                            {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
                        </SheetTitle>
                        <SheetDescription className="text-muted-foreground">
                            {selectedDate && (isToday(selectedDate) ? "Today's schedule" : "Events for this day")}
                        </SheetDescription>
                    </SheetHeader>

                    {selectedDate && (
                        <div className="space-y-6 px-6 pb-6">
                            {/* Actions */}
                            <Button onClick={handleOpenAddNote} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Note
                            </Button>

                            {/* Events List */}
                            <div className="space-y-4">
                                {(() => {
                                    const { exams, notes: dayNotes } = getEventsForDate(selectedDate);

                                    if (exams.length === 0 && dayNotes.length === 0) {
                                        return (
                                            <div className="text-center py-10 border border-dashed border-border rounded-xl bg-muted/50">
                                                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <CalendarIcon className="w-6 h-6 text-muted-foreground" />
                                                </div>
                                                <p className="text-muted-foreground">No events scheduled</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <>
                                            {exams.map(exam => (
                                                <div key={exam.id} className="bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 p-4 rounded-r-lg">
                                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-1">
                                                        <Clock className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Exam</span>
                                                    </div>
                                                    <h3 className="font-bold text-lg mb-1 text-foreground">{exam.title}</h3>
                                                    <p className="text-sm text-muted-foreground">{exam.subject} • {exam.duration} mins</p>
                                                </div>
                                            ))}

                                            {dayNotes.map(note => (
                                                <div key={note.id} className="bg-card border border-border/50 p-4 rounded-xl group relative">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-bold text-lg text-foreground">{note.title}</h3>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive -mr-2 -mt-2"
                                                            onClick={(e) => handleDeleteNote(note.id, e)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>

                                                    {(note.startTime || note.endTime) && (
                                                        <div className="flex items-center gap-2 text-sm text-primary mb-3 font-medium">
                                                            <Clock className="w-4 h-4" />
                                                            {note.startTime || "..."} - {note.endTime || "..."}
                                                        </div>
                                                    )}

                                                    {note.description && (
                                                        <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-3 rounded-lg">
                                                            {note.description}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Add Note Dialog */}
            <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
                <DialogContent className="bg-background border-border text-foreground sm:max-w-[500px] data-[state=open]:animate-none data-[state=closed]:animate-none transition-none">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Add New Note</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Create a reminder for {selectedDate ? format(selectedDate, "MMMM d") : "this date"}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-muted-foreground">Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Study Session"
                                value={noteTitle}
                                onChange={(e) => setNoteTitle(e.target.value)}
                                className="bg-muted/50 border-border text-foreground focus:border-primary"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start" className="text-muted-foreground">Start Time</Label>
                                <Input
                                    id="start"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="bg-muted/50 border-border text-foreground focus:border-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end" className="text-muted-foreground">End Time</Label>
                                <Input
                                    id="end"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="bg-muted/50 border-border text-foreground focus:border-primary"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="desc" className="text-muted-foreground">Description</Label>
                            <Textarea
                                id="desc"
                                placeholder="Add details..."
                                value={noteDesc}
                                onChange={(e) => setNoteDesc(e.target.value)}
                                className="bg-muted/50 border-border text-foreground min-h-[100px] focus:border-primary"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddNoteOpen(false)} className="text-muted-foreground hover:text-foreground">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveNote} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            Save Note
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
