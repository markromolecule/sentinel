export interface Question {
  id: string;
  examId: string;
  text: string;
  options: {
    id: string;
    text: string;
  }[];
  correctOptionId: string;
}

export const mockQuestions: Question[] = [
  // Exam 1: Mathematics Final Exam
  {
    id: 'q1',
    examId: '1',
    text: 'Which of the following describes the behavior of a function where every element in the domain maps to a unique element in the codomain?',
    options: [
      { id: 'A', text: 'Injective (One-to-One)' },
      { id: 'B', text: 'Surjective (Onto)' },
      { id: 'C', text: 'Bijective' },
      { id: 'D', text: 'Constant' },
    ],
    correctOptionId: 'A',
  },
  {
    id: 'q2',
    examId: '1',
    text: 'What is the derivative of f(x) = 3x^2 + 2x - 5?',
    options: [
      { id: 'A', text: '6x + 2' },
      { id: 'B', text: '3x + 2' },
      { id: 'C', text: '6x - 5' },
      { id: 'D', text: 'x^2' },
    ],
    correctOptionId: 'A',
  },
  {
    id: 'q3',
    examId: '1',
    text: 'Solve for x: 2x + 5 = 15',
    options: [
      { id: 'A', text: '10' },
      { id: 'B', text: '5' },
      { id: 'C', text: '2.5' },
      { id: 'D', text: '7.5' },
    ],
    correctOptionId: 'B',
  },
  {
    id: 'q4',
    examId: '1',
    text: 'What is the area of a circle with radius 5?',
    options: [
      { id: 'A', text: '25π' },
      { id: 'B', text: '10π' },
      { id: 'C', text: '50π' },
      { id: 'D', text: '5π' },
    ],
    correctOptionId: 'A',
  },
  {
    id: 'q5',
    examId: '1',
    text: 'What is the area of a circle with radius 5?',
    options: [
      { id: 'A', text: '25π' },
      { id: 'B', text: '10π' },
      { id: 'C', text: '50π' },
      { id: 'D', text: '5π' },
    ],
    correctOptionId: 'A',
  },
  {
    id: 'q6',
    examId: '1',
    text: 'What is the area of a circle with radius 5?',
    options: [
      { id: 'A', text: '25π' },
      { id: 'B', text: '10π' },
      { id: 'C', text: '50π' },
      { id: 'D', text: '5π' },
    ],
    correctOptionId: 'A',
  },
  {
    id: 'q7',
    examId: '1',
    text: 'What is the area of a circle with radius 5?',
    options: [
      { id: 'A', text: '25π' },
      { id: 'B', text: '10π' },
      { id: 'C', text: '50π' },
      { id: 'D', text: '5π' },
    ],
    correctOptionId: 'A',
  },
  {
    id: 'q8',
    examId: '1',
    text: 'What is the area of a circle with radius 5?',
    options: [
      { id: 'A', text: '25π' },
      { id: 'B', text: '10π' },
      { id: 'C', text: '50π' },
      { id: 'D', text: '5π' },
    ],
    correctOptionId: 'A',
  },
  {
    id: 'q9',
    examId: '1',
    text: 'What is the area of a circle with radius 5?',
    options: [
      { id: 'A', text: '25π' },
      { id: 'B', text: '10π' },
      { id: 'C', text: '50π' },
      { id: 'D', text: '5π' },
    ],
    correctOptionId: 'A',
  },
  {
    id: 'q10',
    examId: '1',
    text: 'What is the area of a circle with radius 5?',
    options: [
      { id: 'A', text: '25π' },
      { id: 'B', text: '10π' },
      { id: 'C', text: '50π' },
      { id: 'D', text: '5π' },
    ],
    correctOptionId: 'A',
  },
];
