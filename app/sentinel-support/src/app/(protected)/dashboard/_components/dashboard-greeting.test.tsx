import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DashboardGreeting, getTimeOfDayGreeting, formatDisplayName } from './dashboard-greeting';

describe('getTimeOfDayGreeting', () => {
    let dateSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        dateSpy = vi.spyOn(Date.prototype, 'getHours');
    });

    afterEach(() => {
        dateSpy.mockRestore();
    });

    it('returns "Good morning" when hour is 8', () => {
        dateSpy.mockReturnValue(8);
        expect(getTimeOfDayGreeting()).toBe('Good morning');
    });

    it('returns "Good morning" when hour is 0', () => {
        dateSpy.mockReturnValue(0);
        expect(getTimeOfDayGreeting()).toBe('Good morning');
    });

    it('returns "Good morning" when hour is 11', () => {
        dateSpy.mockReturnValue(11);
        expect(getTimeOfDayGreeting()).toBe('Good morning');
    });

    it('returns "Good afternoon" when hour is 14', () => {
        dateSpy.mockReturnValue(14);
        expect(getTimeOfDayGreeting()).toBe('Good afternoon');
    });

    it('returns "Good afternoon" when hour is 12', () => {
        dateSpy.mockReturnValue(12);
        expect(getTimeOfDayGreeting()).toBe('Good afternoon');
    });

    it('returns "Good afternoon" when hour is 17', () => {
        dateSpy.mockReturnValue(17);
        expect(getTimeOfDayGreeting()).toBe('Good afternoon');
    });

    it('returns "Good evening" when hour is 20', () => {
        dateSpy.mockReturnValue(20);
        expect(getTimeOfDayGreeting()).toBe('Good evening');
    });

    it('returns "Good evening" when hour is 18', () => {
        dateSpy.mockReturnValue(18);
        expect(getTimeOfDayGreeting()).toBe('Good evening');
    });

    it('returns "Good evening" when hour is 23', () => {
        dateSpy.mockReturnValue(23);
        expect(getTimeOfDayGreeting()).toBe('Good evening');
    });
});

describe('formatDisplayName', () => {
    it('extracts name from email and capitalizes it', () => {
        expect(formatDisplayName('support@sentinelph.tech')).toBe('Support');
        expect(formatDisplayName('jake.harper@gmail.com')).toBe('Jake');
        expect(formatDisplayName('joseph-cruz_profile@test.com')).toBe('Joseph');
    });

    it('formats normal names correctly', () => {
        expect(formatDisplayName('Joseph Cruz')).toBe('Joseph');
        expect(formatDisplayName('jake_harper')).toBe('Jake');
    });

    it('normalizes uppercase names to first-letter capital only', () => {
        expect(formatDisplayName('KEANNA')).toBe('Keanna');
        expect(formatDisplayName('KEANNA CRUZ')).toBe('Keanna');
        expect(formatDisplayName('JAKE_HARPER')).toBe('Jake');
    });
});

describe('DashboardGreeting', () => {
    it('renders the formatted displayName in the heading', () => {
        render(<DashboardGreeting fullName="support@sentinelph.tech" />);
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading.textContent).toContain('Support');
    });

    it('renders the formatted current date', () => {
        render(<DashboardGreeting fullName="Joseph Cruz" />);
        const year = new Date().getFullYear().toString();
        const dateText = screen.getByLabelText(new RegExp(year));
        expect(dateText).toBeTruthy();
    });

    it('renders the contextual sub-text', () => {
        render(<DashboardGreeting fullName="Joseph Cruz" />);
        expect(screen.getByText(/lets check what/i)).toBeTruthy();
    });
});
