import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── React mock ───────────────────────────────────────────────────────────────
// PassageCard uses useState for isExpanded. We mock React to intercept it.
let stateStore: any[] = [];
let stateIdx = 0;

vi.mock('react', () => ({
    useState: (initial: any) => {
        const i = stateIdx++;
        if (stateStore[i] === undefined) stateStore[i] = initial;
        const set = (v: any) => {
            stateStore[i] = typeof v === 'function' ? v(stateStore[i]) : v;
        };
        return [stateStore[i], set];
    },
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
    useColorScheme: () => 'light',
}));

vi.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}));

vi.mock('@/constants/theme', () => ({
    Colors: {
        light: { text: '#000', background: '#fff' },
        dark: { text: '#fff', background: '#000' },
    },
}));

import { PassageCard } from './passage-card';

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PassageCard', () => {
    beforeEach(() => {
        stateStore = [];
        stateIdx = 0;
    });

    it('renders the passage body when initially expanded', () => {
        const tree = PassageCard({ passage: 'Once upon a time in a land far away…' });
        expect(findText(tree, 'Once upon a time in a land far away…')).toBe(true);
    });

    it('renders a default title when no title prop is provided', () => {
        const tree = PassageCard({ passage: 'Some text.' });
        expect(findText(tree, 'Reading Passage')).toBe(true);
    });

    it('renders the provided title', () => {
        const tree = PassageCard({ passage: 'Text here.', title: 'Historical Context' });
        expect(findText(tree, 'Historical Context')).toBe(true);
    });

    it('does not render the passage body when collapsed (isExpanded = false)', () => {
        stateStore = [false]; // Pre-seed: isExpanded = false
        stateIdx = 0;

        const tree = PassageCard({ passage: 'Secret text.' });
        expect(findText(tree, 'Secret text.')).toBe(false);
    });

    it('includes an accessibilityRole of article on the outer container', () => {
        const tree = PassageCard({ passage: 'Hello' });
        expect((tree as any).props?.accessibilityRole).toBe('article');
    });
});
