import { type DbClient } from '@sentinel/db';
import { type CreateCalendarEventBody, type UpdateCalendarEventBody } from './calendar.dto';
import { getCalendarEvents, getCalendarEventById } from './services/calendar-query.service';
import {
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
} from './services/calendar-write.service';

/**
 * CalendarService — static facade that delegates each operation to the
 * appropriate domain service. Controllers should only call methods here.
 */
export class CalendarService {
    /**
     * Returns all calendar events visible to the requesting user's institution,
     * optionally filtered by month and year.
     */
    static async getCalendarEvents(
        dbClient: DbClient,
        {
            institutionId,
            role,
            userId,
            month,
            year,
        }: {
            institutionId: string;
            role?: string;
            userId: string;
            month?: string;
            year?: string;
        },
    ) {
        return await getCalendarEvents(dbClient, { institutionId, role, userId, month, year });
    }

    /**
     * Returns a single calendar event by ID, scoped to the institution.
     * Throws 404 if the event does not exist or belongs to another institution.
     */
    static async getCalendarEventById(
        dbClient: DbClient,
        {
            eventId,
            institutionId,
        }: {
            eventId: string;
            institutionId: string;
        },
    ) {
        return await getCalendarEventById(dbClient, { eventId, institutionId });
    }

    /**
     * Creates a new calendar event scoped to the given institution.
     */
    static async createCalendarEvent(
        dbClient: DbClient,
        {
            payload,
            userId,
            institutionId,
        }: {
            payload: CreateCalendarEventBody;
            userId: string;
            institutionId: string;
        },
    ) {
        return await createCalendarEvent({ dbClient, payload, userId, institutionId });
    }

    /**
     * Updates an existing calendar event. Verifies the event belongs to the
     * institution before applying changes.
     */
    static async updateCalendarEvent(
        dbClient: DbClient,
        {
            eventId,
            payload,
            userId,
            institutionId,
        }: {
            eventId: string;
            payload: UpdateCalendarEventBody;
            userId: string;
            institutionId: string;
        },
    ) {
        return await updateCalendarEvent({ dbClient, eventId, payload, userId, institutionId });
    }

    /**
     * Deletes a calendar event. Verifies the event belongs to the institution
     * before deletion.
     */
    static async deleteCalendarEvent(
        dbClient: DbClient,
        {
            eventId,
            institutionId,
            userId,
            hasDeletePermission,
        }: {
            eventId: string;
            institutionId: string;
            userId: string;
            hasDeletePermission: boolean;
        },
    ) {
        return await deleteCalendarEvent({
            dbClient,
            eventId,
            institutionId,
            userId,
            hasDeletePermission,
        });
    }
}
