import { sql } from 'kysely';

export const OPERATIONAL_MONITORING_ATTEMPT_STATES = ['IN_PROGRESS', 'LOCKED'] as const;

export function getMonitoringAttemptLifecyclePriority(lifecycleState: string | null | undefined) {
    return OPERATIONAL_MONITORING_ATTEMPT_STATES.some((state) => state === lifecycleState) ? 0 : 1;
}

/**
 * Applies the canonical attempt selection ordering to a Kysely query builder.
 *
 * This rule prefers the current active/operational attempt (in state IN_PROGRESS or LOCKED),
 * falling back to the newest attempt (by created_at descending) if no operational attempt exists.
 *
 * @param query The select query builder instance.
 * @returns The query builder with the ordering clauses applied.
 */
export function applyMonitoringAttemptOrdering<QB extends { orderBy: (...args: any[]) => any }>(
    query: QB,
): QB {
    return query
        .orderBy('ea.student_id')
        .orderBy(
            sql`case when ea.lifecycle_state in ('IN_PROGRESS', 'LOCKED') then 0 else 1 end`,
            'asc',
        )
        .orderBy('ea.created_at', 'desc');
}
