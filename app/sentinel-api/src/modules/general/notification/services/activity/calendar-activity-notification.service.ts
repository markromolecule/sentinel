import { type DbClient } from '@sentinel/db';
import { type CreateCalendarEventBody } from '../../../calendar/calendar.dto';
import * as activityBase from './activity-notification-base.service';
import { type SupportedActorRole } from './activity-notification-base.service';


const DEFAULT_CALENDAR_AUDIENCE_RECIPIENT_ROLES = [
    'student',
    'instructor',
    'admin',
    'superadmin',
    'support',
] as const;

const CALENDAR_AUDIENCE_RECIPIENT_ROLE_MAP = {
    STUDENTS: ['student'],
    INSTRUCTORS: ['instructor'],
    ADMINS: ['admin', 'superadmin'],
    SPECIFIC_GROUP: [],
} as const;

/**
 * Maps a calendar audience to the recipient roles that should receive the
 * resulting institution activity notification.
 */
export function mapCalendarAudienceToRecipientRoles(args: {
    targetAudience: CreateCalendarEventBody['targetAudience'];
    actorRole: SupportedActorRole | null;
}) {
    const { targetAudience, actorRole } = args;

    if (targetAudience === 'ALL' || !targetAudience) {
        if (actorRole === 'support') {
            return ['student', 'instructor', 'admin', 'superadmin'];
        }

        return [...DEFAULT_CALENDAR_AUDIENCE_RECIPIENT_ROLES];
    }

    if (targetAudience && targetAudience in CALENDAR_AUDIENCE_RECIPIENT_ROLE_MAP) {
        return [...CALENDAR_AUDIENCE_RECIPIENT_ROLE_MAP[targetAudience]];
    }

    return [...DEFAULT_CALENDAR_AUDIENCE_RECIPIENT_ROLES];
}

export class CalendarActivityNotificationService {
    /**
     * Dispatches a calendar creation notification through the shared activity
     * routing path so calendar fan-out follows the platform's institution and
     * permission rules.
     */
    static async notifyCalendarEventCreated(args: {
        dbClient: DbClient;
        actorUserId: string;
        institutionId: string;
        eventId: string;
        payload: CreateCalendarEventBody;
    }) {
        const actorName = await activityBase.getUserDisplayName(args.dbClient, args.actorUserId);
        const actorRole = await activityBase.getUserPrimaryRole(args.dbClient, args.actorUserId);
        const roleNames = mapCalendarAudienceToRecipientRoles({
            targetAudience: args.payload.targetAudience,
            actorRole,
        });

        if (roleNames.length === 0) {
            return;
        }

        await activityBase.notifyInstitutionActivity({
            dbClient: args.dbClient,
            actorUserId: args.actorUserId,
            institutionId: args.institutionId,
            permissionKey: 'notifications:view',
            actionType: 'INSTITUTION_ACTIVITY_CREATED',
            resourceType: 'INSTITUTION_ACTIVITY',
            resourceId: args.eventId,
            resourceLabel: args.payload.title,
            roleNames,
            metadata: {
                eventType: args.payload.eventType,
                targetAudience: args.payload.targetAudience,
                calendarEventId: args.eventId,
            },
            title: `New Calendar Event: ${args.payload.title}`,
            message:
                args.payload.description ||
                `${actorName} created a new calendar event "${args.payload.title}".`,
            sourceModule: 'calendar',
            sourceAction: 'create',
            targetType: 'CALENDAR_EVENT',
            operation: 'CREATED',
            includeChildInstitutions: true,
        });
    }
}
