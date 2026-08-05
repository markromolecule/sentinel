import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { getCalendarEventsData, getCalendarEventByIdData } from '../data';

/**
 * Retrieves all calendar events visible to the given institution.
 */
export async function getCalendarEvents(
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
    return await getCalendarEventsData(dbClient, { institutionId, role, userId, month, year });
}

/**
 * Retrieves a single calendar event by ID. Throws a 404 if not found or belongs to another institution.
 */
export async function getCalendarEventById(
    dbClient: DbClient,
    {
        eventId,
        institutionId,
    }: {
        eventId: string;
        institutionId: string;
    },
) {
    const record = await getCalendarEventByIdData(dbClient, { eventId, institutionId });

    if (!record) {
        throw new HTTPException(404, { message: 'Calendar event not found.' });
    }

    return record;
}
