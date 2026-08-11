import { vi, describe, it, expect } from 'vitest';
import React from 'react';

// Mock React to allow shallow functional testing
vi.mock('react', () => ({
    createElement: (type: any, props: any, ...children: any[]) => ({
        type,
        props: {
            ...props,
            children:
                children.length === 0
                    ? props?.children
                    : children.length === 1
                      ? children[0]
                      : children,
        },
    }),
    default: {},
}));

// Mock React Native
vi.mock('react-native', () => ({
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView',
    StyleSheet: {
        create: (styles: any) => styles,
    },
    useColorScheme: () => 'light',
}));

vi.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}));

vi.mock('@/constants/theme', () => ({
    Colors: {
        light: {
            text: '#11181C',
            background: '#fff',
            tint: '#323d8f',
            icon: '#687076',
            primary: '#323d8f',
            border: '#e4e4e7',
            card: '#fff',
        },
        dark: {
            text: '#ECEDEE',
            background: '#0f0f10',
            tint: '#fff',
            icon: '#9BA1A6',
            primary: '#fff',
            border: '#27272a',
            card: '#18181b',
        },
    },
}));

const mockBuildReports = vi.fn();
vi.mock('@sentinel/shared', () => ({
    buildExamAttemptQuestionReports: () => mockBuildReports(),
}));

import { ResultView } from './result-view';

// Helper to search text inside the rendered node tree
function findText(node: any, content: string): boolean {
    if (!node || typeof node !== 'object') return false;
    if (node.type === 'Text') {
        const raw = node.props?.children;
        const text = Array.isArray(raw) ? raw.join('') : String(raw ?? '');
        if (text.toLowerCase().includes(content.toLowerCase())) return true;
    }
    const children = node.props?.children;
    if (!children) return false;
    const list = Array.isArray(children) ? children : [children];
    return list.some((c: any) => findText(c, content));
}

// Helper to find specific component types (like TouchableOpacity)
function findNode(node: any, predicate: (n: any) => boolean): any {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    const children = node.props?.children;
    if (!children) return null;
    const list = Array.isArray(children) ? children : [children];
    for (const child of list) {
        const result = findNode(child, predicate);
        if (result) return result;
    }
    return null;
}

describe('ResultView Component', () => {
    const mockExam = {
        id: 'exam-123',
        title: 'Midterm Exam',
        description: 'Test Exam',
        duration: 60,
        passingPercentage: 70,
        status: 'published' as any,
        createdAt: '',
        updatedAt: '',
        subject: 'Math',
        professor: 'Dr. Smith',
        questions: 10,
        passingScore: 70,
        difficulty: 'Medium' as any,
        instructions: [],
    };

    const mockAnswers = {};
    const mockOnReturn = vi.fn();

    it('should render Passed status when student meets the threshold', () => {
        mockBuildReports.mockReturnValue([]);
        const summary = {
            score: 8,
            totalScore: 10,
            percentage: 80,
            answeredCount: 10,
            autoGradableQuestionCount: 10,
            manualReviewQuestionCount: 0,
            requiresManualReview: false,
        };

        const node = ResultView({
            exam: mockExam,
            summary,
            answers: mockAnswers,
            onReturnToDashboard: mockOnReturn,
        });

        expect(findText(node, 'PASSED')).toBe(true);
        expect(findText(node, 'DID NOT PASS')).toBe(false);
        expect(findText(node, '80%')).toBe(true);
        expect(findText(node, 'Midterm Exam')).toBe(true);
    });

    it('should render Did Not Pass status when student is below the threshold', () => {
        mockBuildReports.mockReturnValue([]);
        const summary = {
            score: 4,
            totalScore: 10,
            percentage: 40,
            answeredCount: 10,
            autoGradableQuestionCount: 10,
            manualReviewQuestionCount: 0,
            requiresManualReview: false,
        };

        const node = ResultView({
            exam: mockExam,
            summary,
            answers: mockAnswers,
            onReturnToDashboard: mockOnReturn,
        });

        expect(findText(node, 'DID NOT PASS')).toBe(true);
        expect(findText(node, 'PASSED')).toBe(false);
        expect(findText(node, '40%')).toBe(true);
    });

    it('should call onReturnToDashboard when return button is clicked', () => {
        mockBuildReports.mockReturnValue([]);
        const summary = {
            score: 8,
            totalScore: 10,
            percentage: 80,
            answeredCount: 10,
            autoGradableQuestionCount: 10,
            manualReviewQuestionCount: 0,
            requiresManualReview: false,
        };

        const node = ResultView({
            exam: mockExam,
            summary,
            answers: mockAnswers,
            onReturnToDashboard: mockOnReturn,
        });

        const button = findNode(node, (n) => n.type === 'TouchableOpacity');
        expect(button).toBeDefined();
        button.props.onPress();

        expect(mockOnReturn).toHaveBeenCalled();
    });
});
