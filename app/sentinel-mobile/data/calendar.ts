export interface CalendarEvent {
  id: string;
  type: 'exam' | 'note';
  title: string;
  time: string; // e.g., "10:00 AM - 11:30 AM" or just "10:00 AM"
  description?: string;
  date: string; // YYYY-MM-DD
}

export const mockCalendarData: Record<string, CalendarEvent[]> = {
  '2026-02-12': [
    {
      id: '1',
      type: 'note',
      title: 'Review Physics Notes',
      time: '09:00 AM',
      description: 'Focus on thermodynamics chapter.',
      date: '2026-02-12',
    },
  ],
  '2026-02-13': [ // Tomorrow (assuming today is 12th based on prompt context or just generic)
    {
      id: '2',
      type: 'exam',
      title: 'Calculus Midterm',
      time: '01:00 PM - 03:00 PM',
      description: 'Room 304 • Prof. Smith',
      date: '2026-02-13',
    },
  ],
  '2026-02-15': [
    {
      id: '3',
      type: 'note',
      title: 'Group Study',
      time: '04:00 PM',
      description: 'Library meeting room.',
      date: '2026-02-15',
    },
  ],
};
