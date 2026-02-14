import { UserPlus, Smartphone, Shield, BarChart3, CheckCheck } from 'lucide-react';

export const STEPS = [
    {
        number: '01',
        icon: UserPlus,
        title: 'Create Exam Session',
        description: 'Proctors configure the exam session by setting schedules, parameters, and monitoring preferences.',
    },
    {
        number: '02',
        icon: Smartphone,
        title: 'Register & Assign Students',
        description: 'Students are enrolled individually or via bulk import to ensure accurate and organized participation.',
    },
    {
        number: '03',
        icon: Shield,
        title: 'Activate Smart Monitoring',
        description: 'During the exam, real-time AI monitoring tracks gaze movement, audio activity, and suspicious behaviors automatically.',
    },
    {
        number: '04',
        icon: BarChart3,
        title: 'Analyze Session Reports',
        description: 'Detailed analytics, flagged incidents, and behavioral insights are generated for review after the exam.',
    },
    {
        number: '05',
        icon: CheckCheck,
        title: 'Take Action & Archive',
        description: 'Proctors validate flagged cases, export reports if needed, and securely archive session records for documentation.',
    },
];