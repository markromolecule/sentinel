import { type DbClient } from '@sentinel/db';

export const getLobbyCount = async (dbClient: DbClient, examId: string) => {
    const row = await dbClient
        .selectFrom('exam_lobby_admissions as ela')
        .leftJoin('exam_attempts as ea_active', (join) =>
            join
                .onRef('ea_active.exam_id', '=', 'ela.exam_id')
                .onRef('ea_active.student_id', '=', 'ela.student_id')
                .on('ea_active.status', '=', 'IN_PROGRESS'),
        )
        .leftJoin('exam_attempts as ea_completed', (join) =>
            join
                .onRef('ea_completed.exam_id', '=', 'ela.exam_id')
                .onRef('ea_completed.student_id', '=', 'ela.student_id')
                .on((eb) =>
                    eb.or([
                        eb('ea_completed.status', '=', 'COMPLETED'),
                        eb('ea_completed.lifecycle_state', '=', 'SUBMITTED'),
                    ]),
                ),
        )
        .select((eb) => eb.fn.count('ela.student_id').distinct().as('count'))
        .where('ela.exam_id', '=', examId)
        .where('ela.status', 'in', ['WAITING', 'APPROVED'])
        .where('ea_completed.attempt_id', 'is', null)
        .where((eb) =>
            eb.or([
                eb('ela.status', '=', 'WAITING'),
                eb('ea_active.attempt_id', 'is', null),
            ]),
        )
        .executeTakeFirst();

    return {
        count: Number(row?.count ?? 0),
    };
};

