import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExamAttemptAnswers, ExamAttemptScoreSummary } from '@sentinel/shared/types';

export type MobileStoredExamPreview = {
    sessionId: string;
    answers: ExamAttemptAnswers;
    elapsedSeconds: number;
    summary: ExamAttemptScoreSummary & { completedAt?: string };
    completedAt?: string;
};

const SESSION_KEY_PREFIX = 'sentinel-mobile:exam-session:';
const PREVIEW_KEY_PREFIX = 'sentinel-mobile:exam-preview:';

export type MobileStoredExamSession = {
    sessionId: string;
    examId: string;
    isResumed: boolean;
};

function getSessionKey(examId: string) {
    return `${SESSION_KEY_PREFIX}${examId}`;
}

function getPreviewKey(examId: string) {
    return `${PREVIEW_KEY_PREFIX}${examId}`;
}

export async function readStoredMobileExamSession(examId: string) {
    const raw = await AsyncStorage.getItem(getSessionKey(examId));
    return raw ? (JSON.parse(raw) as MobileStoredExamSession) : null;
}

export async function writeStoredMobileExamSession(session: MobileStoredExamSession) {
    await AsyncStorage.setItem(getSessionKey(session.examId), JSON.stringify(session));
}

export async function clearStoredMobileExamSession(examId: string) {
    await AsyncStorage.removeItem(getSessionKey(examId));
}

export async function readStoredMobileExamPreview(examId: string) {
    const raw = await AsyncStorage.getItem(getPreviewKey(examId));
    return raw ? (JSON.parse(raw) as MobileStoredExamPreview) : null;
}

export async function writeStoredMobileExamPreview(
    examId: string,
    preview: MobileStoredExamPreview,
) {
    await AsyncStorage.setItem(getPreviewKey(examId), JSON.stringify(preview));
}

export async function clearStoredMobileExamPreview(examId: string) {
    await AsyncStorage.removeItem(getPreviewKey(examId));
}

import type { MediaPipeCalibrationProfile } from '@sentinel/shared';

const CALIBRATION_KEY_PREFIX = 'sentinel-mobile:calibration-profile:';

function getCalibrationKey(examId: string) {
    return `${CALIBRATION_KEY_PREFIX}${examId}`;
}

export async function readStoredMobileCalibrationProfile(
    examId: string,
): Promise<MediaPipeCalibrationProfile | null> {
    const raw = await AsyncStorage.getItem(getCalibrationKey(examId));
    return raw ? (JSON.parse(raw) as MediaPipeCalibrationProfile) : null;
}

export async function writeStoredMobileCalibrationProfile(
    examId: string,
    profile: MediaPipeCalibrationProfile,
): Promise<void> {
    await AsyncStorage.setItem(getCalibrationKey(examId), JSON.stringify(profile));
}

export async function clearStoredMobileCalibrationProfile(examId: string): Promise<void> {
    await AsyncStorage.removeItem(getCalibrationKey(examId));
}
