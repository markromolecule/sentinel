import {
    AccessToken,
    RoomServiceClient,
    TrackSource,
    WebhookReceiver,
    type ParticipantInfo,
    type WebhookEvent,
} from 'livekit-server-sdk';
import { getLiveKitConfig, type LiveKitConfig } from '../livekit.config';

export type LiveKitParticipantRole = 'publisher' | 'viewer';

export class LiveKitProviderError extends Error {
    constructor(
        public readonly code:
            'PROVIDER_ROOM_ERROR' | 'PROVIDER_TOKEN_ERROR' | 'PROVIDER_WEBHOOK_ERROR',
        message = 'LiveKit provider operation failed.',
    ) {
        super(message);
        this.name = 'LiveKitProviderError';
    }
}

export type LiveKitManagedServiceDeps = {
    config?: LiveKitConfig;
    roomClient?: Pick<
        RoomServiceClient,
        'createRoom' | 'removeParticipant' | 'deleteRoom' | 'listParticipants'
    >;
    tokenFactory?: typeof AccessToken;
    webhookReceiver?: Pick<WebhookReceiver, 'receive'>;
};

export type LiveKitTokenResult = {
    token: string;
    participantIdentity: string;
    liveKitUrl: string;
    expiresAt: Date;
};

/**
 * Wraps managed LiveKit room, token, participant, and webhook operations.
 */
export class LiveKitManagedService {
    private readonly config: LiveKitConfig;
    private readonly roomClient: Pick<
        RoomServiceClient,
        'createRoom' | 'removeParticipant' | 'deleteRoom' | 'listParticipants'
    >;
    private readonly tokenFactory: typeof AccessToken;
    private readonly webhookReceiver: Pick<WebhookReceiver, 'receive'>;

    constructor(deps: LiveKitManagedServiceDeps = {}) {
        this.config = deps.config ?? getLiveKitConfig();

        if (!this.config.liveKitUrl || !this.config.apiKey || !this.config.apiSecret) {
            throw new LiveKitProviderError('PROVIDER_ROOM_ERROR', 'LiveKit is not configured.');
        }

        this.roomClient =
            deps.roomClient ??
            new RoomServiceClient(
                toLiveKitApiUrl(this.config.liveKitUrl),
                this.config.apiKey,
                this.config.apiSecret,
            );
        this.tokenFactory = deps.tokenFactory ?? AccessToken;
        this.webhookReceiver =
            deps.webhookReceiver ?? new WebhookReceiver(this.config.apiKey, this.config.apiSecret);
    }

    /**
     * Creates a two-participant inspection room with lease-only metadata.
     */
    async createInspectionRoom(args: { roomName: string; leaseId: string }) {
        try {
            return await withProviderTimeout(
                this.roomClient.createRoom({
                    name: args.roomName,
                    maxParticipants: 2,
                    emptyTimeout: this.config.roomEmptyTimeoutSeconds,
                    departureTimeout: this.config.roomDepartureTimeoutSeconds,
                    metadata: JSON.stringify({ leaseId: args.leaseId }),
                }),
                this.config.requestTimeoutMs,
            );
        } catch (error) {
            throw mapProviderError(error, 'PROVIDER_ROOM_ERROR');
        }
    }

    /**
     * Creates a camera-only publisher token for the lease's student.
     */
    async createPublisherToken(args: { roomName: string; leaseId: string }) {
        return this.createJoinToken(args, 'publisher');
    }

    /**
     * Creates a subscribe-only viewer token for the lease owner.
     */
    async createViewerToken(args: { roomName: string; leaseId: string }) {
        return this.createJoinToken(args, 'viewer');
    }

    /**
     * Removes one opaque participant identity and treats provider not-found as success.
     */
    async removeParticipant(args: { roomName: string; participantIdentity: string }) {
        try {
            await withProviderTimeout(
                this.roomClient.removeParticipant(args.roomName, args.participantIdentity),
                this.config.requestTimeoutMs,
            );
        } catch (error) {
            if (isProviderNotFound(error)) return;
            throw mapProviderError(error, 'PROVIDER_ROOM_ERROR');
        }
    }

    /**
     * Deletes a room and treats provider not-found as success.
     */
    async deleteInspectionRoom(roomName: string) {
        try {
            await withProviderTimeout(
                this.roomClient.deleteRoom(roomName),
                this.config.requestTimeoutMs,
            );
        } catch (error) {
            if (isProviderNotFound(error)) return;
            throw mapProviderError(error, 'PROVIDER_ROOM_ERROR');
        }
    }

    /**
     * Lists provider participants in an inspection room.
     */
    async listInspectionParticipants(roomName: string): Promise<ParticipantInfo[]> {
        try {
            return await withProviderTimeout(
                this.roomClient.listParticipants(roomName),
                this.config.requestTimeoutMs,
            );
        } catch (error) {
            if (isProviderNotFound(error)) return [];
            throw mapProviderError(error, 'PROVIDER_ROOM_ERROR');
        }
    }

    /**
     * Verifies a LiveKit webhook signature before returning the parsed event.
     */
    async receiveWebhook(rawBody: string, authorizationHeader: string | undefined) {
        try {
            return await this.webhookReceiver.receive(rawBody, authorizationHeader);
        } catch {
            throw new LiveKitProviderError('PROVIDER_WEBHOOK_ERROR', 'Invalid LiveKit webhook.');
        }
    }

    private async createJoinToken(
        args: { roomName: string; leaseId: string },
        role: LiveKitParticipantRole,
    ): Promise<LiveKitTokenResult> {
        try {
            const participantIdentity = buildLiveKitParticipantIdentity(args.leaseId, role);
            const token = new this.tokenFactory(this.config.apiKey!, this.config.apiSecret!, {
                identity: participantIdentity,
                ttl: this.config.tokenTtlSeconds,
            });

            token.addGrant(
                role === 'publisher'
                    ? {
                          room: args.roomName,
                          roomJoin: true,
                          canPublish: true,
                          canPublishSources: [TrackSource.CAMERA],
                          canSubscribe: false,
                          canPublishData: false,
                      }
                    : {
                          room: args.roomName,
                          roomJoin: true,
                          canPublish: false,
                          canSubscribe: true,
                          canPublishData: false,
                      },
            );

            return {
                token: await token.toJwt(),
                participantIdentity,
                liveKitUrl: this.config.liveKitUrl!,
                expiresAt: new Date(Date.now() + this.config.tokenTtlSeconds * 1000),
            };
        } catch (error) {
            throw mapProviderError(error, 'PROVIDER_TOKEN_ERROR');
        }
    }
}

/**
 * Builds lease-specific opaque participant identities without names or emails.
 */
export function buildLiveKitParticipantIdentity(leaseId: string, role: LiveKitParticipantRole) {
    return `live-inspection:${role}:${leaseId}`;
}

/**
 * Extracts the provider room name from webhook event shapes.
 */
export function getLiveKitWebhookRoomName(event: WebhookEvent | { room?: { name?: string } }) {
    return event.room?.name ?? null;
}

function toLiveKitApiUrl(liveKitUrl: string) {
    const url = new URL(liveKitUrl);
    url.protocol = 'https:';
    return url.toString();
}

function isProviderNotFound(error: unknown) {
    const status = Number((error as { status?: number; code?: number }).status ?? 0);
    const code = Number((error as { code?: number }).code ?? 0);
    const message = String((error as { message?: string }).message ?? '').toLowerCase();

    return status === 404 || code === 404 || message.includes('not found');
}

function withProviderTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new LiveKitProviderError('PROVIDER_ROOM_ERROR'));
        }, timeoutMs);

        operation.then(
            (result) => {
                clearTimeout(timeout);
                resolve(result);
            },
            (error) => {
                clearTimeout(timeout);
                reject(error);
            },
        );
    });
}

function mapProviderError(
    error: unknown,
    code: 'PROVIDER_ROOM_ERROR' | 'PROVIDER_TOKEN_ERROR' | 'PROVIDER_WEBHOOK_ERROR',
) {
    if (error instanceof LiveKitProviderError) {
        return error;
    }

    return new LiveKitProviderError(code);
}
