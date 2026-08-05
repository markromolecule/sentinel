import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { OpenAPIHono } from '@hono/zod-openapi';
import { CalendarService } from '../calendar.service';
import {
    getCalendarEventsRoute,
    getCalendarEventsRouteHandler,
} from './get-calendar-events.controller';
import {
    getCalendarEventRoute,
    getCalendarEventRouteHandler,
} from './get-calendar-event.controller';
import {
    createCalendarEventRoute,
    createCalendarEventRouteHandler,
} from './create-calendar-event.controller';
import {
    updateCalendarEventRoute,
    updateCalendarEventRouteHandler,
} from './update-calendar-event.controller';
import {
    deleteCalendarEventRoute,
    deleteCalendarEventRouteHandler,
} from './delete-calendar-event.controller';

vi.mock('../calendar.service', () => ({
    CalendarService: {
        getCalendarEvents: vi.fn(),
        getCalendarEventById: vi.fn(),
        createCalendarEvent: vi.fn(),
        updateCalendarEvent: vi.fn(),
        deleteCalendarEvent: vi.fn(),
    },
}));

describe('Calendar Controllers', () => {
    // Helper to create test app with injected variables and permissions
    function createTestApp(permissionKeys: string[]) {
        const app = new OpenAPIHono();

        app.use('*', async (c, next) => {
            c.set('dbClient', {} as any);
            c.set('user', { id: 'user-123' } as any);
            c.set('institutionId', 'inst-456');
            c.set('role', 'admin');
            c.set('activePermissionKeys', permissionKeys);
            await next();
        });

        app.openapi(getCalendarEventsRoute, getCalendarEventsRouteHandler);
        app.openapi(getCalendarEventRoute, getCalendarEventRouteHandler);
        app.openapi(createCalendarEventRoute, createCalendarEventRouteHandler);
        app.openapi(updateCalendarEventRoute, updateCalendarEventRouteHandler);
        app.openapi(deleteCalendarEventRoute, deleteCalendarEventRouteHandler);

        return app;
    }

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /calendar', () => {
        it('fetches list of calendar events when authorized', async () => {
            const mockEvents = [
                { eventId: 'e1', title: 'Midterm Exam' },
                { eventId: 'e2', title: 'My note', eventType: 'NOTE', createdBy: 'user-123' },
            ];
            vi.spyOn(CalendarService, 'getCalendarEvents').mockResolvedValue(mockEvents as any);

            const app = createTestApp(['calendar:view']);
            const res = await app.request('/?month=5&year=2026');
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(CalendarService.getCalendarEvents).toHaveBeenCalledWith(expect.anything(), {
                institutionId: 'inst-456',
                role: 'admin',
                userId: 'user-123',
                month: '5',
                year: '2026',
            });
            expect(body).toEqual({
                success: true,
                message: 'Calendar events fetched successfully',
                data: mockEvents,
            });
            expect(body.data).not.toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        title: 'Other student note',
                        eventType: 'NOTE',
                        createdBy: 'user-999',
                    }),
                ]),
            );
        });

        it('returns 403 Forbidden if caller lacks calendar:view permission', async () => {
            const app = createTestApp([]);
            const res = await app.request('/');

            expect(res.status).toBe(403);
            expect(CalendarService.getCalendarEvents).not.toHaveBeenCalled();
        });
    });

    describe('GET /calendar/:id', () => {
        it('fetches a single calendar event by id when authorized', async () => {
            const mockEvent = {
                eventId: '11111111-1111-4111-8111-111111111111',
                title: 'Midterm Exam',
            };
            vi.spyOn(CalendarService, 'getCalendarEventById').mockResolvedValue(mockEvent as any);

            const app = createTestApp(['calendar:view']);
            const res = await app.request('/11111111-1111-4111-8111-111111111111');
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(CalendarService.getCalendarEventById).toHaveBeenCalledWith(expect.anything(), {
                eventId: '11111111-1111-4111-8111-111111111111',
                institutionId: 'inst-456',
            });
            expect(body).toEqual({
                success: true,
                message: 'Calendar event fetched successfully',
                data: mockEvent,
            });
        });

        it('returns 403 Forbidden if caller lacks calendar:view permission for get-by-id', async () => {
            const app = createTestApp([]);
            const res = await app.request('/11111111-1111-4111-8111-111111111111');

            expect(res.status).toBe(403);
        });
    });

    describe('POST /calendar', () => {
        it('creates a calendar event when authorized', async () => {
            const payload = {
                title: 'New Announcement',
                startDate: '2026-05-20T10:00:00.000Z',
                eventType: 'ANNOUNCEMENT',
                targetAudience: 'ALL',
            };
            const mockCreated = { eventId: '11111111-1111-4111-8111-111111111111', ...payload };
            vi.spyOn(CalendarService, 'createCalendarEvent').mockResolvedValue(mockCreated as any);

            const app = createTestApp(['calendar:create']);
            const res = await app.request('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const body = await res.json();

            expect(res.status).toBe(201);
            expect(CalendarService.createCalendarEvent).toHaveBeenCalledWith(expect.anything(), {
                payload: expect.objectContaining({
                    title: 'New Announcement',
                    eventType: 'ANNOUNCEMENT',
                }),
                userId: 'user-123',
                institutionId: 'inst-456',
            });
            expect(body).toEqual({
                success: true,
                message: 'Calendar event created successfully',
                data: mockCreated,
            });
        });

        it('returns 403 Forbidden if caller lacks calendar:create permission', async () => {
            const app = createTestApp([]);
            const res = await app.request('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'New Announcement',
                    startDate: '2026-05-20T10:00:00.000Z',
                }),
            });

            expect(res.status).toBe(403);
        });
    });

    describe('PATCH /calendar/:id', () => {
        it('updates a calendar event when authorized', async () => {
            const payload = { title: 'Updated Exam Title' };
            const mockUpdated = {
                eventId: '11111111-1111-4111-8111-111111111111',
                title: 'Updated Exam Title',
            };
            vi.spyOn(CalendarService, 'updateCalendarEvent').mockResolvedValue(mockUpdated as any);

            const app = createTestApp(['calendar:update']);
            const res = await app.request('/11111111-1111-4111-8111-111111111111', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(CalendarService.updateCalendarEvent).toHaveBeenCalledWith(expect.anything(), {
                eventId: '11111111-1111-4111-8111-111111111111',
                payload,
                userId: 'user-123',
                institutionId: 'inst-456',
            });
            expect(body).toEqual({
                success: true,
                message: 'Calendar event updated successfully',
                data: mockUpdated,
            });
        });

        it('returns 403 Forbidden if caller lacks calendar:update permission', async () => {
            const app = createTestApp([]);
            const res = await app.request('/11111111-1111-4111-8111-111111111111', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Updated Title' }),
            });

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /calendar/:id', () => {
        it('deletes a calendar event when authorized', async () => {
            vi.mocked(CalendarService.deleteCalendarEvent).mockResolvedValue(null as any);

            const app = createTestApp(['calendar:delete']);
            const res = await app.request('/11111111-1111-4111-8111-111111111111', {
                method: 'DELETE',
            });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(CalendarService.deleteCalendarEvent).toHaveBeenCalledWith(expect.anything(), {
                eventId: '11111111-1111-4111-8111-111111111111',
                institutionId: 'inst-456',
                userId: 'user-123',
                hasDeletePermission: true,
            });
            expect(body).toEqual({
                success: true,
                message: 'Calendar event deleted successfully',
                data: null,
            });
        });

        it('returns 403 Forbidden if caller lacks calendar:delete permission', async () => {
            vi.mocked(CalendarService.deleteCalendarEvent).mockRejectedValue(
                new HTTPException(403, { message: '403|Forbidden.' }),
            );
            const app = createTestApp([]);
            const res = await app.request('/11111111-1111-4111-8111-111111111111', {
                method: 'DELETE',
            });

            expect(res.status).toBe(403);
            expect(CalendarService.deleteCalendarEvent).toHaveBeenCalledWith(expect.anything(), {
                eventId: '11111111-1111-4111-8111-111111111111',
                institutionId: 'inst-456',
                userId: 'user-123',
                hasDeletePermission: false,
            });
        });
    });
});
