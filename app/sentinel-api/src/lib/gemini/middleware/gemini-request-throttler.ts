type PendingTask = {
    run: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
};

function parsePositiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? '', 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }

    return parsed;
}

function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export class AiRequestThrottler {
    private readonly pending: PendingTask[] = [];
    private activeCount = 0;
    private lastStartedAt = 0;

    constructor(
        private readonly maxConcurrent: number,
        private readonly minIntervalMs: number,
    ) {}

    async schedule<T>(task: () => Promise<T>) {
        return await new Promise<T>((resolve, reject) => {
            this.pending.push({
                run: task,
                resolve: (value) => resolve(value as T),
                reject,
            });

            void this.drain();
        });
    }

    private async drain() {
        if (!this.pending.length || this.activeCount >= this.maxConcurrent) {
            return;
        }

        const nextTask = this.pending.shift();

        if (!nextTask) {
            return;
        }

        this.activeCount += 1;

        try {
            const delayMs = Math.max(0, this.lastStartedAt + this.minIntervalMs - Date.now());

            if (delayMs > 0) {
                await sleep(delayMs);
            }

            this.lastStartedAt = Date.now();
            nextTask.resolve(await nextTask.run());
        } catch (error) {
            nextTask.reject(error);
        } finally {
            this.activeCount -= 1;

            if (this.pending.length > 0) {
                void this.drain();
            }
        }
    }
}

export const aiRequestThrottler = new AiRequestThrottler(
    parsePositiveInteger(process.env.AI_API_THROTTLE_MAX_CONCURRENT, 5),
    parsePositiveInteger(process.env.AI_API_THROTTLE_MIN_INTERVAL_MS, 300),
);
