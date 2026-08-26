import { vi, describe, it, expect } from 'vitest';

// ─── React mock ───────────────────────────────────────────────────────────────
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
    useEffect: () => {},
}));

// ─── React Native mocks ───────────────────────────────────────────────────────
vi.mock('react-native', () => ({
    View: 'View',
    Text: 'Text',
    Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
    Dimensions: { get: () => ({ height: 812, width: 375 }) },
    ScrollView: 'ScrollView',
    TouchableOpacity: 'TouchableOpacity',
    StyleSheet: {
        create: (styles: any) => styles,
    },
}));

vi.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}));

vi.mock('react-native-reanimated', () => ({
    default: {
        View: 'Animated.View',
    },
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (val: any) => val,
    Easing: {
        out: (fn: any) => fn,
        in: (fn: any) => fn,
        quad: 'quad',
    },
}));

vi.mock('@/types/exam', () => ({}));

import { QuestionDrawer } from './question-drawer';

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

function findAllNodes(node: any, predicate: (n: any) => boolean): any[] {
    const results: any[] = [];
    if (!node || typeof node !== 'object') return results;
    if (predicate(node)) results.push(node);
    const children = node.props?.children;
    if (!children) return results;
    const list = Array.isArray(children) ? children : [children];
    for (const child of list) {
        results.push(...findAllNodes(child, predicate));
    }
    return results;
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

// ─── Test data ────────────────────────────────────────────────────────────────

const defaultColors = {
    text: '#000',
    icon: '#555',
    card: '#fff',
    primary: '#6366f1',
    border: '#e5e7eb',
    background: '#fff',
    input: '#f4f4f5',
};

function makeQuestions(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        id: `q-${i}`,
        text: `Question ${i + 1}?`,
        type: 'MULTIPLE_CHOICE',
        points: 1,
        options: [{ id: 'A', text: 'Alpha' }],
    }));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('QuestionDrawer', () => {
    it('renders question number badges for all questions', () => {
        const questions = makeQuestions(5);

        const tree = QuestionDrawer({
            visible: true,
            onClose: () => {},
            questions,
            currentIndex: 0,
            onSelectQuestion: () => {},
            answers: {},
            flaggedQuestions: {},
            colors: defaultColors as any,
            isDark: false,
            bottomOffset: 80,
        });

        // Each question should produce a TouchableOpacity badge
        const badges = findAllNodes(
            tree,
            (n) =>
                n.type === 'TouchableOpacity' &&
                n.props?.style?.width === 50 &&
                n.props?.style?.height === 50,
        );
        expect(badges).toHaveLength(5);
    });

    it('calls onSelectQuestion and onClose when a question badge is tapped', () => {
        const onSelectQuestion = vi.fn();
        const onClose = vi.fn();
        const questions = makeQuestions(3);

        const tree = QuestionDrawer({
            visible: true,
            onClose,
            questions,
            currentIndex: 0,
            onSelectQuestion,
            answers: {},
            flaggedQuestions: {},
            colors: defaultColors as any,
            isDark: false,
            bottomOffset: 80,
        });

        // Find the second badge (index 1)
        const badges = findAllNodes(
            tree,
            (n) =>
                n.type === 'TouchableOpacity' &&
                n.props?.style?.width === 50,
        );
        expect(badges.length).toBeGreaterThanOrEqual(3);

        // Tap the second question badge
        badges[1].props.onPress();
        expect(onSelectQuestion).toHaveBeenCalledWith(1);
        expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when the close icon button is pressed', () => {
        const onClose = vi.fn();
        const questions = makeQuestions(2);

        const tree = QuestionDrawer({
            visible: true,
            onClose,
            questions,
            currentIndex: 0,
            onSelectQuestion: () => {},
            answers: {},
            flaggedQuestions: {},
            colors: defaultColors as any,
            isDark: false,
            bottomOffset: 80,
        });

        // The close button is a TouchableOpacity wrapping an Ionicons "close" icon
        const closeBtn = findNode(
            tree,
            (n) => {
                if (n.type !== 'TouchableOpacity') return false;
                // The close button has the Ionicons child with name="close"
                const icon = findNode(n, (child: any) =>
                    child.type === 'Ionicons' && child.props?.name === 'close',
                );
                return !!icon;
            },
        );
        expect(closeBtn).not.toBeNull();
        closeBtn.props.onPress();
        expect(onClose).toHaveBeenCalled();
    });

    it('does not render TouchableWithoutFeedback (touch blocker removed)', () => {
        const questions = makeQuestions(3);

        const tree = QuestionDrawer({
            visible: true,
            onClose: () => {},
            questions,
            currentIndex: 0,
            onSelectQuestion: () => {},
            answers: {},
            flaggedQuestions: {},
            colors: defaultColors as any,
            isDark: false,
            bottomOffset: 80,
        });

        // TouchableWithoutFeedback should not appear anywhere in the tree
        const twf = findNode(tree, (n) => n.type === 'TouchableWithoutFeedback');
        expect(twf).toBeNull();
    });

    it('does not set onStartShouldSetResponder on the ScrollView', () => {
        const questions = makeQuestions(3);

        const tree = QuestionDrawer({
            visible: true,
            onClose: () => {},
            questions,
            currentIndex: 0,
            onSelectQuestion: () => {},
            answers: {},
            flaggedQuestions: {},
            colors: defaultColors as any,
            isDark: false,
            bottomOffset: 80,
        });

        const scrollView = findNode(tree, (n) => n.type === 'ScrollView');
        expect(scrollView).not.toBeNull();
        expect(scrollView.props.onStartShouldSetResponder).toBeUndefined();
    });

    it('highlights the current question badge with the primary border color', () => {
        const questions = makeQuestions(3);

        const tree = QuestionDrawer({
            visible: true,
            onClose: () => {},
            questions,
            currentIndex: 1, // Second question is current
            onSelectQuestion: () => {},
            answers: {},
            flaggedQuestions: {},
            colors: defaultColors as any,
            isDark: false,
            bottomOffset: 80,
        });

        const badges = findAllNodes(
            tree,
            (n) =>
                n.type === 'TouchableOpacity' &&
                n.props?.style?.width === 50,
        );
        expect(badges.length).toBeGreaterThanOrEqual(3);

        // The second badge (index 1) should have primary border color
        expect(badges[1].props.style.borderColor).toBe('#6366f1');
    });

    it('shows answered state styling on answered questions', () => {
        const questions = makeQuestions(3);

        const tree = QuestionDrawer({
            visible: true,
            onClose: () => {},
            questions,
            currentIndex: 0,
            onSelectQuestion: () => {},
            answers: { 'q-1': 'A' }, // Second question is answered
            flaggedQuestions: {},
            colors: defaultColors as any,
            isDark: false,
            bottomOffset: 80,
        });

        const badges = findAllNodes(
            tree,
            (n) =>
                n.type === 'TouchableOpacity' &&
                n.props?.style?.width === 50,
        );

        // Second badge should have answered green background
        expect(badges[1].props.style.backgroundColor).toBe('#ecfdf5');
    });

    it('renders a flag indicator on flagged questions', () => {
        const questions = makeQuestions(3);

        const tree = QuestionDrawer({
            visible: true,
            onClose: () => {},
            questions,
            currentIndex: 0,
            onSelectQuestion: () => {},
            answers: {},
            flaggedQuestions: { 'q-2': true }, // Third question is flagged
            colors: defaultColors as any,
            isDark: false,
            bottomOffset: 80,
        });

        const badges = findAllNodes(
            tree,
            (n) =>
                n.type === 'TouchableOpacity' &&
                n.props?.style?.width === 50,
        );

        // Third badge (q-2) should have amber border and a flag icon child
        expect(badges[2].props.style.borderColor).toBe('#f59e0b');
        const flagIcon = findNode(badges[2], (n) =>
            n.type === 'Ionicons' && n.props?.name === 'flag',
        );
        expect(flagIcon).not.toBeNull();
    });

    it('renders the legend with Current, Answered, and Flagged labels', () => {
        const questions = makeQuestions(2);

        const tree = QuestionDrawer({
            visible: true,
            onClose: () => {},
            questions,
            currentIndex: 0,
            onSelectQuestion: () => {},
            answers: {},
            flaggedQuestions: {},
            colors: defaultColors as any,
            isDark: false,
            bottomOffset: 80,
        });

        expect(findText(tree, 'Current')).toBe(true);
        expect(findText(tree, 'Answered')).toBe(true);
        expect(findText(tree, 'Flagged')).toBe(true);
    });
});
