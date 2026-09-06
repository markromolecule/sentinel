'use client';

import { useState, useEffect } from 'react';
import { CalendarClock } from 'lucide-react';

/**
 * Returns a time-sensitive greeting string based on the current hour of the day.
 *
 * - 00:00–11:59 → "Good morning"
 * - 12:00–17:59 → "Good afternoon"
 * - 18:00–23:59 → "Good evening"
 */
export function getTimeOfDayGreeting(): 'Good morning' | 'Good afternoon' | 'Good evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

/**
 * Formats a raw user name or email into a clean display name.
 * Extracts the user's first name (first word in the name string).
 * e.g., "support@sentinelph.tech" -> "Support"
 * e.g., "jake.harper" -> "Jake"
 * e.g., "Joseph Cruz" -> "Joseph"
 */
export function formatDisplayName(name: string): string {
    const part = name.includes('@') ? name.split('@')[0] : name;
    const cleanName = part
        .split(/[\._-]/)
        .join(' ')
        .trim();
    const words = cleanName.split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'User';
    const firstName = words[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

interface DashboardGreetingProps {
    /** The display name of the currently logged-in user. */
    fullName: string;
}

/**
 * Renders a personalized greeting section at the top of the dashboard.
 * Shows a time-of-day salutation, the user's full name, today's formatted date/time,
 * and a contextual sub-text to orient the user.
 *
 * @param props.fullName - The full name (or fallback) of the authenticated user.
 */
export function DashboardGreeting({ fullName }: DashboardGreetingProps) {
    const displayName = formatDisplayName(fullName);

    const [greeting, setGreeting] = useState<string>('');
    const [dateTimeString, setDateTimeString] = useState<string>('');
    const [shortDateTimeString, setShortDateTimeString] = useState<string>('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        const updateGreetingAndDateTime = () => {
            const longDateStr = new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }).format(new Date());

            const shortDateStr = new Intl.DateTimeFormat('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            }).format(new Date());

            const timeStr = new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });

            setDateTimeString(`${longDateStr} • ${timeStr}`);
            setShortDateTimeString(`${shortDateStr} • ${timeStr}`);

            const hour = new Date().getHours();
            let currentGreeting = 'Good evening';
            if (hour < 12) {
                currentGreeting = 'Good morning';
            } else if (hour < 18) {
                currentGreeting = 'Good afternoon';
            }
            setGreeting(currentGreeting);
        };

        updateGreetingAndDateTime();

        const interval = setInterval(() => {
            updateGreetingAndDateTime();
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-primary text-2xl font-extrabold tracking-tight md:text-3xl">
                    {mounted ? `${greeting}, ${displayName}!` : 'Loading...'}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Lets check what&apos;s happening today
                </p>
            </div>
            <div
                className="inline-flex min-h-[32px] shrink-0 items-center gap-2 self-start rounded-full border bg-slate-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-600 shadow-xs sm:self-auto dark:bg-slate-900 dark:text-slate-300"
                title={mounted ? dateTimeString : undefined}
                aria-label={mounted ? dateTimeString : 'Loading...'}
            >
                <CalendarClock className="size-3.5 text-slate-400" />
                <span className="whitespace-nowrap">
                    {mounted ? shortDateTimeString : 'Loading...'}
                </span>
            </div>
        </div>
    );
}
