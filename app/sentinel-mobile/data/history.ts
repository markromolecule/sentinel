export interface FlaggedEvent {
  timestamp: string;
  reason: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface ExamHistory {
  id: string;
  title: string;
  subject: string;
  date: string;
  duration: number; // in minutes
  score: number;
  totalScore: number;
  status: 'Passed' | 'Failed';
  thumbnail?: string;
  flaggedEvents?: FlaggedEvent[];
  feedback?: string;
}

export const mockHistory: ExamHistory[] = [
  {
    id: '1',
    title: 'Physics Midterm Exam',
    subject: 'Physics',
    date: '1/15/2026',
    duration: 75,
    score: 85,
    totalScore: 100,
    status: 'Passed',
    feedback: 'Excellent work on the mechanics section. Keep practicing thermodynamics.',
  },
  {
    id: '2',
    title: 'Chemistry Quiz',
    subject: 'Chemistry',
    date: '1/10/2026',
    duration: 25,
    score: 92,
    totalScore: 100,
    status: 'Passed',
  },
  {
    id: '3',
    title: 'Biology Lab Exam',
    subject: 'Biology',
    date: '1/5/2026',
    duration: 55,
    score: 78,
    totalScore: 100,
    status: 'Passed',
  },
  {
    id: '4',
    title: 'Filipino Exam',
    subject: 'Filipino',
    date: '12/15/2025',
    duration: 50,
    score: 58,
    totalScore: 100,
    status: 'Failed',
    flaggedEvents: [
      { timestamp: '10:15 AM', reason: 'Focus lost (Tab switch detected)', severity: 'High' },
      { timestamp: '10:32 AM', reason: 'Multiple faces detected', severity: 'Medium' },
    ],
    feedback: 'Please ensure you stay within the exam environment at all times.',
  },
  {
    id: '5',
    title: 'Mobile Dev Quiz',
    subject: 'Computer Science',
    date: '11/30/2025',
    duration: 15,
    score: 45,
    totalScore: 50,
    status: 'Failed',
    flaggedEvents: [
      { timestamp: '2:05 PM', reason: 'Talking detected', severity: 'Low' },
    ],
  },
];
