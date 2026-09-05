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
    if (!node) return null;
    if (Array.isArray(node)) {
        for (const child of node) {
            const result = findNode(child, predicate);
            if (result) return result;
        }
        return null;
    }
    if (typeof node !== 'object') return null;
    if (predicate(node)) return node;
    const children = node.props?.children;
    if (!children) return null;
    return findNode(children, predicate);
}

function findText(node: any, content: string): boolean {
    if (!node) return false;
    if (Array.isArray(node)) {
        return node.some((child: any) => findText(child, content));
    }
    if (typeof node !== 'object') return false;
    if (node.type === 'Text') {
        const raw = node.props?.children;
        const text = Array.isArray(raw) ? raw.join('') : String(raw ?? '');
        if (text.includes(content)) return true;
    }
    const children = node.props?.children;
    if (!children) return false;
    return findText(children, content);
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
    it('renders a fallback container when question is null', () => {
        const tree = QuestionCard({
            question: null,
            currentIndex: 0,
            totalQuestions: 5,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });
        expect(tree).not.toBeNull();
        expect(tree.props.accessibilityRole).toBe('alert');
        expect(tree.props.accessibilityLabel).toBe('Question unavailable');
        expect(findText(tree, 'Question Unavailable')).toBe(true);
        expect(findText(tree, 'Question details could not be loaded')).toBe(true);
    });

    it('renders a fallback container when question is undefined', () => {
        const tree = QuestionCard({
            question: undefined,
            currentIndex: 2,
            totalQuestions: 10,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });
        expect(tree).not.toBeNull();
        expect(tree.props.accessibilityLabel).toBe('Question unavailable');
    });

    it('renders default fallback prompt text when question.text is empty', () => {
        const question = makeQuestion('MULTIPLE_CHOICE', {
            text: '',
            options: [{ id: 'A', text: 'Alpha' }],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 1,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });

        expect(findText(tree, 'Question prompt unavailable.')).toBe(true);
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

    it('marks MULTIPLE_CHOICE as selected when selectedOptionId matches option text', () => {
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
            selectedOptionId: 'Alpha',
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

    it('renders fallback TextInput for unmapped question types', () => {
        const question = makeQuestion('CUSTOM_TYPE' as any, {
            placeholder: 'Custom type placeholder',
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
    });

    it('renders MATCHING pairs inputs and triggers onSelectOption on change', () => {
        const onSelectOption = vi.fn();
        const question = makeQuestion('MATCHING', {
            pairs: [
                { left: 'Left Item 1', right: 'Right Item 1' },
                { left: 'Left Item 2', right: 'Right Item 2' },
            ],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 1,
            selectedOptionId: { 'Left Item 1': 'Matched Val' },
            isFlagged: false,
            onSelectOption,
            onToggleFlag: () => {},
        });

        expect(findText(tree, 'Left Item 1')).toBe(true);
        expect(findText(tree, 'Left Item 2')).toBe(true);

        const input1 = findNode(
            tree,
            (n) => n.type === 'TextInput' && n.props?.accessibilityLabel === 'Match for Left Item 1',
        );
        expect(input1).not.toBeNull();
        expect(input1.props.defaultValue).toBe('Matched Val');

        input1.props.onChangeText('Updated Val');
        expect(onSelectOption).toHaveBeenCalledWith({
            'Left Item 1': 'Updated Val',
        });
    });

    it('renders FILL_BLANK multiple blank inputs', () => {
        const onSelectOption = vi.fn();
        const question = makeQuestion('FILL_BLANK', {
            blanks: ['Blank 1', 'Blank 2'],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 1,
            selectedOptionId: ['Value 1', 'Value 2'],
            isFlagged: false,
            onSelectOption,
            onToggleFlag: () => {},
        });

        expect(findText(tree, 'Blank 1')).toBe(true);
        expect(findText(tree, 'Blank 2')).toBe(true);

        const input2 = findNode(
            tree,
            (n) => n.type === 'TextInput' && n.props?.accessibilityLabel === 'Blank 2',
        );
        expect(input2).not.toBeNull();
        input2.props.onChangeText('New Val');
        expect(onSelectOption).toHaveBeenCalledWith(['Value 1', 'New Val']);
    });

    it('renders fallback TextInput for MULTIPLE_CHOICE when options array is empty', () => {
        const onSelectOption = vi.fn();
        const question = makeQuestion('MULTIPLE_CHOICE', {
            options: [],
        });

        const tree = QuestionCard({
            question,
            currentIndex: 0,
            totalQuestions: 1,
            selectedOptionId: 'Typed answer',
            isFlagged: false,
            onSelectOption,
            onToggleFlag: () => {},
        });

        const input = findNode(tree, (n) => n.type === 'TextInput');
        expect(input).not.toBeNull();
        expect(input.props.defaultValue).toBe('Typed answer');
    });

    it('renders point indicator with singular "pt" and plural "pts"', () => {
        const q1 = makeQuestion('MULTIPLE_CHOICE', { points: 1 });
        const tree1 = QuestionCard({
            question: q1,
            currentIndex: 0,
            totalQuestions: 5,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });
        expect(findText(tree1, '1 pt')).toBe(true);

        const q2 = makeQuestion('MULTIPLE_CHOICE', { points: 5 });
        const tree2 = QuestionCard({
            question: q2,
            currentIndex: 1,
            totalQuestions: 5,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });
        expect(findText(tree2, '5 pts')).toBe(true);
    });

    it('renders option letter pills (A., B., C.) for MULTIPLE_CHOICE and MULTIPLE_RESPONSE', () => {
        const mcQuestion = makeQuestion('MULTIPLE_CHOICE', {
            options: [
                { id: 'opt-1', text: 'First choice' },
                { id: 'opt-2', text: 'Second choice' },
            ],
        });
        const mcTree = QuestionCard({
            question: mcQuestion,
            currentIndex: 0,
            totalQuestions: 1,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });
        expect(findText(mcTree, 'A.')).toBe(true);
        expect(findText(mcTree, 'B.')).toBe(true);

        const mrQuestion = makeQuestion('MULTIPLE_RESPONSE', {
            options: [
                { id: 'opt-1', text: 'Option One' },
                { id: 'opt-2', text: 'Option Two' },
            ],
        });
        const mrTree = QuestionCard({
            question: mrQuestion,
            currentIndex: 0,
            totalQuestions: 1,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });
        expect(findText(mrTree, 'A.')).toBe(true);
        expect(findText(mrTree, 'B.')).toBe(true);
    });

    it('supports boolean true and false in selectedOptionId for TRUE_FALSE questions', () => {
        const tfQuestion = makeQuestion('TRUE_FALSE', {
            options: [
                { id: 'true', text: 'True' },
                { id: 'false', text: 'False' },
            ],
        });

        const treeTrue = QuestionCard({
            question: tfQuestion,
            currentIndex: 0,
            totalQuestions: 1,
            selectedOptionId: true,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });
        const trueNode = findNode(
            treeTrue,
            (n) =>
                n.type === 'TouchableOpacity' &&
                n.props?.accessibilityLabel === 'True' &&
                n.props?.accessibilityState?.checked === true,
        );
        expect(trueNode).not.toBeNull();

        const treeFalse = QuestionCard({
            question: tfQuestion,
            currentIndex: 0,
            totalQuestions: 1,
            selectedOptionId: false,
            isFlagged: false,
            onSelectOption: () => {},
            onToggleFlag: () => {},
        });
        const falseNode = findNode(
            treeFalse,
            (n) =>
                n.type === 'TouchableOpacity' &&
                n.props?.accessibilityLabel === 'False' &&
                n.props?.accessibilityState?.checked === true,
        );
        expect(falseNode).not.toBeNull();
    });

    it('renders ENUMERATION numbered item inputs with fallback when blanks is empty', () => {
        const onSelectOption = vi.fn();
        const enumQuestion = makeQuestion('ENUMERATION', {
            blanks: [],
        });

        const tree = QuestionCard({
            question: enumQuestion,
            currentIndex: 0,
            totalQuestions: 1,
            selectedOptionId: ['Alpha', 'Beta'],
            isFlagged: false,
            onSelectOption,
            onToggleFlag: () => {},
        });

        expect(findText(tree, 'Item 1')).toBe(true);
        expect(findText(tree, 'Item 2')).toBe(true);
        expect(findText(tree, 'Item 3')).toBe(true);

        const input1 = findNode(
            tree,
            (n) => n.type === 'TextInput' && n.props?.accessibilityLabel === 'Item 1',
        );
        expect(input1).not.toBeNull();
        expect(input1.props.defaultValue).toBe('Alpha');

        const input3 = findNode(
            tree,
            (n) => n.type === 'TextInput' && n.props?.accessibilityLabel === 'Item 3',
        );
        expect(input3).not.toBeNull();
        input3.props.onChangeText('Gamma');
        expect(onSelectOption).toHaveBeenCalledWith(['Alpha', 'Beta', 'Gamma']);
    });
});
