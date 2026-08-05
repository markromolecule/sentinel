import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCalendarEventsData } from './get-calendar-events';
import { resolveCalendarScopeInstitutionIds } from './resolve-calendar-scope-institution-ids';
import { resolveCalendarRoleAudiences } from './resolve-calendar-role-audiences';

vi.mock('./resolve-calendar-scope-institution-ids', () => ({
    resolveCalendarScopeInstitutionIds: vi.fn(),
}));

vi.mock('./resolve-calendar-role-audiences', () => ({
    resolveCalendarRoleAudiences: vi.fn(),
}));

function createMockQuery(result: unknown[] = []) {
    const expressionBuilders: any[] = [];
    const query: any = {
        leftJoin: vi.fn(() => query),
        select: vi.fn(() => query),
        where: vi.fn((arg: unknown) => {
            if (typeof arg === 'function') {
                const eb: any = (...args: unknown[]) => args;
                eb.or = vi.fn((items: unknown[]) => items);
                expressionBuilders.push(eb);
                arg(eb);
            }
            return query;
        }),
        orderBy: vi.fn(() => query),
        execute: vi.fn(async () => result),
        __expressionBuilders: expressionBuilders,
    };

    return query;
}

describe('getCalendarEventsData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('keeps the institution and audience filters while excluding foreign NOTE records', async () => {
        const query = createMockQuery([
            { eventId: 'event-1', title: 'Public event' },
        ]);
        const dbClient = {
            selectFrom: vi.fn(() => query),
        } as any;

        vi.mocked(resolveCalendarScopeInstitutionIds).mockResolvedValue(['inst-1']);
        vi.mocked(resolveCalendarRoleAudiences).mockReturnValue(['STUDENTS']);

        await getCalendarEventsData(dbClient, {
            institutionId: 'inst-1',
            userId: 'user-1',
            role: 'student',
            month: '5',
            year: '2026',
        });

        expect(resolveCalendarScopeInstitutionIds).toHaveBeenCalledWith(dbClient, 'inst-1');
        expect(resolveCalendarRoleAudiences).toHaveBeenCalledWith('student');
        expect(query.where).toHaveBeenCalledTimes(5);

        const ownerExpressionBuilder = query.__expressionBuilders.at(-1);

        expect(ownerExpressionBuilder.or).toHaveBeenCalledWith([
            ['ce.event_type', '!=', 'NOTE'],
            ['ce.created_by', '=', 'user-1'],
        ]);
    });
});
