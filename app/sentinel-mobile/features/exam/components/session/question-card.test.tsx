import { vi, describe, it, expect } from 'vitest';

// ─── React mock ───────────────────────────────────────────────────────────────
// QuestionCard does NOT use useState/useEffect so we only need createElement.
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

// ─── React Native mocks ───────────────────────────────────────────────────────
vi.mock('react-native', () => ({
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView',
    TextInput: 'TextInput',
    useColorScheme: () => 'light',
}));

vi.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}));

vi.mock('@/constants/theme', () => ({
    Colors: {
        light: {
            text: '#000',
            icon: '#555',
            card: '#fff',
            primary: '#6366f1',
            border: '#e5e7eb',
        },
        dark: {
            text: '#fff',
            icon: '#aaa',
            card: '#1f2937',
            primary: '#818cf8',
            border: '#374151',
        },
    },
}));

// Stub PassageCard as a string constant so it appears as a known type.
vi.mock('./passage-card', () => ({
    PassageCard: 'PassageCard',
}));

import { QuestionCard } from './question-card';
import type { MobileSessionQuestion } from '@/features/exam/lib/mobile-exam-adapter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function findText(node: any, content: string): boolean {
    if (!node || typeof node !== 'object') return false;
    if (node.type === 'Text') {
        const raw = node.props?.children;
        const text = Array.isArray(raw) ? raw.join('') : String(raw ?? '');
        if (text.includes(content)) return true;
    }
    const children = node.props?.children;
    if (!children) return false;
    const list = Array.isArray(children) ? children : [children];
    return list.some((c: any) => findText(c, content));
}

function makeQuestion(
    type: MobileSessionQuestion['type'],
    overrides: Partial<MobileSessionQuestion> = {},
): MobileSessionQuestion {
    return {
        id: 'q-1',
        text: 'Sample question?',
        type,
        points: 1,
        options: [],
        passage: null,
        passageTitle: null,
        originalContent: {},
        ...overrides,
    } as MobileSessionQuestion;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('QuestionCard', () => {
    it('returns null when question is falsy', () => {
        const result = QuestionCard({
            question: null,
            currentIndex: 0,
            totalQuestions: 5,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });
        expect(result).toBeNull();
    });

    it('renders question text', () => {
        const question = makeQuestion('MULTIPLE_CHOICE', {
            text: 'What is 2+2?',
            options: [
                { id: 'A', text: '3' },
                { id: 'B', text: '4' },
            ],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 10,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });

        expect(findText(tree, 'What is 2+2?')).toBe(true);
    });

    it('renders MULTIPLE_CHOICE option texts', () => {
        const question = makeQuestion('MULTIPLE_CHOICE', {
            options: [
                { id: 'A', text: 'Alpha' },
                { id: 'B', text: 'Beta' },
            ],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 2,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });

        expect(findText(tree, 'Alpha')).toBe(true);
        expect(findText(tree, 'Beta')).toBe(true);
    });

    it('marks a MULTIPLE_CHOICE option as selected via accessibilityState', () => {
        const question = makeQuestion('MULTIPLE_CHOICE', {
            options: [
                { id: 'A', text: 'Alpha' },
                { id: 'B', text: 'Beta' },
            ],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 2,
            selectedOptionId: 'A',
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });

        const selectedNode = findNode(
            tree,
            (n) =>
                n.type === 'TouchableOpacity' &&
                n.props?.accessibilityLabel === 'Alpha' &&
                n.props?.accessibilityState?.checked === true,
        );
        expect(selectedNode).not.toBeNull();
    });

    it('renders MULTIPLE_RESPONSE with "Select all that apply" label', () => {
        const question = makeQuestion('MULTIPLE_RESPONSE', {
            options: [
                { id: 'A', text: 'One' },
                { id: 'B', text: 'Two' },
            ],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 1,
            selectedOptionId: [],
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });

        expect(findText(tree, 'Select all that apply')).toBe(true);
    });

    it('renders TRUE_FALSE with True and False options', () => {
        const question = makeQuestion('TRUE_FALSE', {
            options: [
                { id: 'true', text: 'True' },
                { id: 'false', text: 'False' },
            ],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 1,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });

        expect(findText(tree, 'True')).toBe(true);
        expect(findText(tree, 'False')).toBe(true);
    });

    it('renders ESSAY with a multiline TextInput', () => {
        const question = makeQuestion('ESSAY', {
            placeholder: 'Write your response here…',
            maxLength: 2000,
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 1,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });

        const input = findNode(
            tree,
            (n) => n.type === 'TextInput' && n.props?.multiline === true,
        );
        expect(input).not.toBeNull();
        expect(input.props.maxLength).toBe(2000);
    });

    it('renders IDENTIFICATION with a non-multiline TextInput', () => {
        const question = makeQuestion('IDENTIFICATION', {
            placeholder: 'Enter your answer here…',
            maxLength: 250,
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 1,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });

        const input = findNode(tree, (n) => n.type === 'TextInput');
        expect(input).not.toBeNull();
        expect(input.props.multiline).toBeFalsy();
    });

    it('renders PassageCard when question has a passage', () => {
        const question = makeQuestion('MULTIPLE_CHOICE', {
            passage: 'Once upon a time…',
            passageTitle: 'Story',
            options: [{ id: 'A', text: 'Option' }],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 1,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });

        const passageCard = findNode(tree, (n) => n.type === 'PassageCard');
        expect(passageCard).not.toBeNull();
        expect(passageCard.props.passage).toBe('Once upon a time…');
        expect(passageCard.props.title).toBe('Story');
    });

    it('does not render PassageCard when question has no passage', () => {
        const question = makeQuestion('MULTIPLE_CHOICE', {
            passage: null,
            options: [{ id: 'A', text: 'Option' }],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 1,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });

        const passageCard = findNode(tree, (n) => n.type === 'PassageCard');
        expect(passageCard).toBeNull();
    });

    it('calls onSelectOption with option id when a MULTIPLE_CHOICE item is pressed', () => {
        const onSelectOption = vi.fn();
        const question = makeQuestion('MULTIPLE_CHOICE', {
            options: [{ id: 'A', text: 'Alpha' }],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 1,
            isFlagged: false,
            onSelectOption,
            onToggleFlag: () => {},
        });

        const optionButton = findNode(
            tree,
            (n) => n.type === 'TouchableOpacity' && n.props?.accessibilityLabel === 'Alpha',
        );
        expect(optionButton).not.toBeNull();
        optionButton.props.onPress();
        expect(onSelectOption).toHaveBeenCalledWith('A');
    });

    it('calls onToggleFlag when the flag button is pressed', () => {
        const onToggleFlag = vi.fn();
        const question = makeQuestion('MULTIPLE_CHOICE', {
            options: [{ id: 'A', text: 'Option' }],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 1,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag,
        });

        const flagBtn = findNode(
            tree,
            (n) =>
                n.type === 'TouchableOpacity' &&
                n.props?.accessibilityLabel === 'Flag question for review',
        );
        expect(flagBtn).not.toBeNull();
        flagBtn.props.onPress();
        expect(onToggleFlag).toHaveBeenCalled();
    });
});
