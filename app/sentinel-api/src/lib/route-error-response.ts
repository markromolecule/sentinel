import { Context } from 'hono';
import { type HonoEnv } from '../types/hono';

export function respondWithRouteError(
    c: Context<HonoEnv>,
    error: any,
    label: string,
    fallbackMessage = 'Internal Server Error',
) {
    const status = typeof error?.status === 'number' ? error.status : 500;
    const message = status >= 500 ? fallbackMessage : error?.message || fallbackMessage;

    if (status >= 500) {
        console.error(label, error);
    }

    return c.json({ error: message }, status as any);
}
