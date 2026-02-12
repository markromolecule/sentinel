export interface Exam {
  id: string;
  title: string;
  subject: string;
  duration: number; // in minutes
  professor: string;
  status: 'available' | 'upcoming' | 'completed';
  date?: string;
  description: string;
  instructions: string[];
  questions: number;
  passingPercentage: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const mockExams: Exam[] = [
  {
    id: '1',
    title: 'Mathematics Final Exam',
    subject: 'Mathematics',
    duration: 120,
    professor: 'Dr. Alan Turing',
    status: 'available',
    description: 'Comprehensive final exam covering algebra, geometry, and calculus',
    instructions: [
      'Ensure stable internet connection.',
      'Full-screen mode will be enforced.',
      'No tab switching allowed.',
      'Review answers before submitting.',
    ],
    questions: 50,
    passingPercentage: 70,
    difficulty: 'Hard',
  },
  {
    id: '2',
    title: 'English Literature Quiz',
    subject: 'English',
    duration: 45,
    professor: 'Prof. J.K. Rowling',
    status: 'upcoming',
    date: '2026-02-15',
    description: 'Assessment on Shakespeare and modern literature themes',
    instructions: [
      'Read all questions carefully.',
      'Answer in complete sentences.',
      'Cite examples from the texts.',
    ],
    questions: 25,
    passingPercentage: 60,
    difficulty: 'Medium',
  },
  {
    id: '3',
    title: 'Science Practical Exam',
    subject: 'Science',
    duration: 90,
    professor: 'Dr. Marie Curie',
    status: 'available',
    description: 'Hands-on laboratory assessment covering physics and chemistry experiments',
    instructions: [
      'Follow safety protocols.',
      'Document all observations.',
      'Complete within time limit.',
      'Submit all findings before leaving.',
    ],
    questions: 35,
    passingPercentage: 65,
    difficulty: 'Hard',
  },
  {
    id: '4',
    title: 'History Midterm',
    subject: 'History',
    duration: 60,
    professor: 'Prof. Yuval Noah Harari',
    status: 'upcoming',
    date: '2026-02-18',
    description: 'Midterm covering World War II and post-war developments',
    instructions: [
      'Multiple choice and essay format.',
      'Use historical evidence.',
      'Stay within word limits.',
    ],
    questions: 40,
    passingPercentage: 70,
    difficulty: 'Medium',
  },
  {
    id: '5',
    title: 'Computer Science Quiz',
    subject: 'Computer Science',
    duration: 30,
    professor: 'Dr. Ada Lovelace',
    status: 'available',
    description: 'Quick assessment on algorithms and data structures',
    instructions: [
      'Code snippets required.',
      'Explain your logic.',
      'Test your solutions.',
    ],
    questions: 20,
    passingPercentage: 75,
    difficulty: 'Easy',
  },
];
