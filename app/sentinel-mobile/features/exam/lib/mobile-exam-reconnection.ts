import { AppState, Alert } from 'react-native';
import { writeStoredMobileExamSession } from './mobile-exam-storage';

export interface ReconnectionConfig {
    examId: string;
    sessionId: string;
    onReconnectionFailed?: () => void;
}

export class MobileExamReconnection {
    private retryCount = 0;
    private maxRetries = 3;
    private baseDelay = 1000; // 1 second
    private isConnected = true;
    private timer: NodeJS.Timeout | null = null;
    private appStateSubscription: any = null;

    constructor(
        private config: ReconnectionConfig,
        private router: any,
        baseDelay?: number
    ) {
        if (baseDelay !== undefined) {
            this.baseDelay = baseDelay;
        }
    }

    public startListening() {
        this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    }

    public stopListening() {
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = null;
        }
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    private handleAppStateChange = (nextAppState: string) => {
        if (nextAppState === 'active') {
            void this.checkConnectionAndRecover();
        }
    };

    public triggerNetworkDisruption() {
        this.isConnected = false;
        this.retryCount = 0;
        this.attemptReconnection();
    }

    private attemptReconnection() {
        if (this.retryCount >= this.maxRetries) {
            void this.handleReconnectionFailure();
            return;
        }

        const delay = this.baseDelay * Math.pow(2, this.retryCount);
        this.retryCount++;

        this.timer = setTimeout(() => {
            void this.checkConnectionAndRecover();
        }, delay);
    }

    private async checkConnectionAndRecover() {
        try {
            // Simple ping to check connection
            const response = await fetch('https://clients3.google.com/generate_204', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache',
            });
            // Opaque types or standard ok indicate we are back online
            if (response.ok || response.status === 204 || response.type === 'opaque') {
                this.isConnected = true;
                this.retryCount = 0;
                return;
            }
        } catch (e) {
            // Still offline
        }

        this.attemptReconnection();
    }

    private async handleReconnectionFailure() {
        this.stopListening();
        // Redirect to lobby with isResumed = true
        await writeStoredMobileExamSession({
            sessionId: this.config.sessionId,
            examId: this.config.examId,
            isResumed: true,
        });

        Alert.alert(
            'Connection Lost',
            'Your network connection was lost. Redirecting back to the lobby to resume your exam.',
            [
                {
                    text: 'OK',
                    onPress: () => {
                        if (this.config.onReconnectionFailed) {
                            this.config.onReconnectionFailed();
                        } else {
                            this.router.replace(`/exam/${this.config.examId}/lobby`);
                        }
                    },
                },
            ]
        );
    }
}
