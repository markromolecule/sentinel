import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExamAttemptWorkspace } from './exam-attempt-workspace';

class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
global.ResizeObserver = MockResizeObserver;

vi.mock('@sentinel/ui', () => ({
    ScrollArea: ({ children, className }: any) => (
        <div className={className} data-testid="scroll-area">
            {children}
        </div>
    ),
    cn: (...args: any[]) => args.filter(Boolean).join(' '),
    ResizablePanelGroup: ({ children }: any) => <div data-testid="resizable-group">{children}</div>,
    ResizablePanel: ({ children }: any) => <div data-testid="resizable-panel">{children}</div>,
    ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

vi.mock('./exam-attempt-desktop-question-navigation-rail', () => ({
    ExamAttemptDesktopQuestionNavigationRail: () => (
        <div data-testid="desktop-rail">Desktop Rail</div>
    ),
}));

vi.mock('./exam-attempt-mobile-question-navigation', () => ({
    ExamAttemptMobileQuestionNavigation: () => (
        <div data-testid="mobile-navigation">Mobile Navigation</div>
    ),
}));

vi.mock('./exam-attempt-scrollable-content-pane', () => ({
    ExamAttemptScrollableContentPane: ({ children }: any) => (
        <div data-testid="content-pane">{children}</div>
    ),
}));

describe('ExamAttemptWorkspace', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders responsive workspace layout elements', () => {
        const { container } = render(
            <ExamAttemptWorkspace
                questionRail={<div>Rail Items</div>}
                passagePanel={<div data-testid="passage-panel">Passage Context</div>}
                footer={<div data-testid="footer">Footer Items</div>}
            >
                <div data-testid="question-content">Question Content</div>
            </ExamAttemptWorkspace>,
        );

        // Verify elements exist in the DOM ( Tailwind CSS classes handle actual viewport visibility )
        expect(screen.getByTestId('mobile-navigation')).toBeTruthy();
        expect(screen.getByTestId('desktop-rail')).toBeTruthy();
        expect(screen.getAllByTestId('question-content')[0]).toBeTruthy();
        expect(screen.getAllByTestId('passage-panel')[0]).toBeTruthy();
        expect(screen.getByTestId('footer')).toBeTruthy();
        expect(container.querySelector('.md\\:hidden')).toBeTruthy();
        expect(container.querySelector('.md\\:block')).toBeTruthy();
    });

    it('uses the full question pane when the desktop passage panel is hidden', () => {
        render(
            <ExamAttemptWorkspace questionRail={<div>Rail Items</div>}>
                <div data-testid="question-content">Question Content</div>
            </ExamAttemptWorkspace>,
        );

        expect(screen.queryByTestId('resizable-group')).toBeNull();
        expect(screen.queryByTestId('resizable-handle')).toBeNull();
        expect(screen.getAllByTestId('question-content')).toHaveLength(1);
    });
});
