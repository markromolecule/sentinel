import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarService } from './calendar.service';
import * as queryService from './services/calendar-query.service';
import * as writeService from './services/calendar-write.service';

vi.mock('./services/calendar-query.service', () => ({
    getCalendarEvents: vi.fn(),
    getCalendarEventById: vi.fn(),
}));

vi.mock('./services/calendar-write.service', () => ({
    createCalendarEvent: vi.fn(),
    updateCalendarEvent: vi.fn(),
    deleteCalendarEvent: vi.fn(),
}));

describe('CalendarService Facade', () => {
    const mockDbClient = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('delegates getCalendarEvents to calendar-query.service', async () => {
        const expectedResult = [{ event_id: 'e1' }] as any;
        vi.mocked(queryService.getCalendarEvents).mockResolvedValue(expectedResult);

        const result = await CalendarService.getCalendarEvents(mockDbClient, {
            institutionId: 'inst-1',
            role: 'student',
            userId: 'user-1',
            month: '5',
            year: '2026',
        });

        expect(queryService.getCalendarEvents).toHaveBeenCalledWith(mockDbClient, {
            institutionId: 'inst-1',
            role: 'student',
            userId: 'user-1',
            month: '5',
            year: '2026',
        });
        expect(result).toBe(expectedResult);
    });

    it('delegates getCalendarEventById to calendar-query.service', async () => {
        const expectedResult = { event_id: 'e1' } as any;
        vi.mocked(queryService.getCalendarEventById).mockResolvedValue(expectedResult);

        const result = await CalendarService.getCalendarEventById(mockDbClient, {
            eventId: 'e1',
            institutionId: 'inst-1',
        });

        expect(queryService.getCalendarEventById).toHaveBeenCalledWith(mockDbClient, {
            eventId: 'e1',
            institutionId: 'inst-1',
        });
        expect(result).toBe(expectedResult);
    });

    it('delegates createCalendarEvent to calendar-write.service', async () => {
        const payload = { title: 'New Event', startDate: '2026-05-20T00:00:00Z' } as any;
        const expectedResult = { event_id: 'e1', ...payload } as any;
        vi.mocked(writeService.createCalendarEvent).mockResolvedValue(expectedResult);

        const result = await CalendarService.createCalendarEvent(mockDbClient, {
            payload,
            userId: 'user-1',
            institutionId: 'inst-1',
        });

        expect(writeService.createCalendarEvent).toHaveBeenCalledWith({
            dbClient: mockDbClient,
            payload,
            userId: 'user-1',
            institutionId: 'inst-1',
        });
        expect(result).toBe(expectedResult);
    });

    it('delegates updateCalendarEvent to calendar-write.service', async () => {
        const payload = { title: 'Updated Title' } as any;
        const expectedResult = { event_id: 'e1', ...payload } as any;
        vi.mocked(writeService.updateCalendarEvent).mockResolvedValue(expectedResult);

        const result = await CalendarService.updateCalendarEvent(mockDbClient, {
            eventId: 'e1',
            payload,
            userId: 'user-1',
            institutionId: 'inst-1',
        });

        expect(writeService.updateCalendarEvent).toHaveBeenCalledWith({
            dbClient: mockDbClient,
            eventId: 'e1',
            payload,
            userId: 'user-1',
            institutionId: 'inst-1',
        });
        expect(result).toBe(expectedResult);
    });

    it('delegates deleteCalendarEvent to calendar-write.service', async () => {
        vi.mocked(writeService.deleteCalendarEvent).mockResolvedValue(null);

        const result = await CalendarService.deleteCalendarEvent(mockDbClient, {
            eventId: 'e1',
            institutionId: 'inst-1',
            userId: 'user-1',
            hasDeletePermission: true,
        });

        expect(writeService.deleteCalendarEvent).toHaveBeenCalledWith({
            dbClient: mockDbClient,
            eventId: 'e1',
            institutionId: 'inst-1',
            userId: 'user-1',
            hasDeletePermission: true,
        });
        expect(result).toBeNull();
    });
});
