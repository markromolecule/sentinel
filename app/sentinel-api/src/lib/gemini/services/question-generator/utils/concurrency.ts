/**
 * Runs an array of task functions (thunks) with a maximum concurrency limit.
 * Works like Promise.allSettled but caps simultaneous in-flight calls.
 */
export async function runWithConcurrencyLimit<T>(
    tasks: (() => Promise<T>)[],
    limit: number,
): Promise<PromiseSettledResult<T>[]> {
    const results: PromiseSettledResult<T>[] = new Array(tasks.length);
    let nextIndex = 0;

    async function runNext(): Promise<void> {
        const index = nextIndex++;
        if (index >= tasks.length) return;

        try {
            results[index] = { status: 'fulfilled', value: await tasks[index]() };
        } catch (reason) {
            results[index] = { status: 'rejected', reason };
        }

        await runNext();
    }

    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => runNext());
    await Promise.all(workers);

    return results;
}
