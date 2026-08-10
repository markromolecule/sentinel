import { View, ScrollView, StatusBar, Text } from 'react-native';
import { useExamCheckup } from '@/features/exam/hooks/use-exam-checkup';
import { CheckupHeader } from '@/features/exam/components/checkup/checkup-header';
import { CameraPreview } from '@/features/exam/components/checkup/camera-preview';
import { MicLevelMeter } from '@/features/exam/components/checkup/mic-level-meter';
import { CheckupCTA } from '@/features/exam/components/checkup/checkup-cta';

import { getCameraStatusText } from '@/features/exam/lib/camera-checkup-state';
import { Ionicons } from '@expo/vector-icons';

function StatusRow({
    label,
    value,
    icon,
    colors,
    isDark,
}: {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    colors: { text: string; border: string; primary: string };
    isDark: boolean;
}) {
    const isActive = value === 'Locked' || value === 'Required';

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}
        >
            <View
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                }}
            >
                <Ionicons name={icon} size={18} color={isActive ? colors.primary : '#64748b'} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{label}</Text>
            </View>
            <View
                style={{
                    backgroundColor: isActive ? colors.primary + '15' : 'rgba(148, 163, 184, 0.1)',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 8,
                }}
            >
                <Text
                    style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isActive ? colors.primary : '#64748b',
                    }}
                >
                    {value}
                </Text>
            </View>
        </View>
    );
}

export default function CheckupScreen() {
    const {
        exam,
        colors,
        isDark,
        insets,
        cameraFacing,
        cameraReady,
        hasCameraPermission,
        isPermissionLoading,
        requestCameraPermission,
        micLevel,
        micDetected,
        requiresCamera,
        requiresMicrophone,
        isStartingSession,
        onCameraReady,
        onCameraMountError,
        flipCamera,
        handleGoBack,
        handleStartExam,
    } = useExamCheckup();

    const webOrMobileLock = exam?.configuration?.mobileSecurity.prevent_backgrounding
        ? 'Locked'
        : 'Monitor only';

    const cameraStatusText = getCameraStatusText({
        requiresCamera,
        hasPermission: hasCameraPermission,
        cameraReady,
    });

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
                contentContainerStyle={{ paddingBottom: 110 }}
            >
                <CheckupHeader
                    examTitle={exam?.title ?? 'Exam'}
                    isDark={isDark}
                    colors={colors}
                    insetTop={insets.top}
                    onBack={handleGoBack}
                />

                <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
                    <View style={{ marginBottom: 28 }}>
                        <Text
                            style={{
                                fontSize: 24,
                                fontWeight: '800',
                                color: colors.text,
                                marginBottom: 6,
                                letterSpacing: -0.5,
                            }}
                        >
                            System Checkup
                        </Text>
                        <Text
                            style={{
                                fontSize: 15,
                                color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b',
                            }}
                        >
                            Verify your device settings before starting.
                        </Text>

                        <View
                            style={{
                                marginTop: 24,
                                backgroundColor: colors.card,
                                borderRadius: 24,
                                paddingHorizontal: 20,
                                paddingVertical: 4,
                                borderWidth: 1,
                                borderColor: colors.border,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.03,
                                shadowRadius: 10,
                                elevation: 2,
                            }}
                        >
                            <StatusRow
                                icon="camera"
                                label="Camera"
                                value={cameraStatusText}
                                colors={colors as any}
                                isDark={isDark}
                            />
                            <StatusRow
                                icon="mic"
                                label="Microphone"
                                value={requiresMicrophone ? 'Required' : 'Optional'}
                                colors={colors as any}
                                isDark={isDark}
                            />
                            <StatusRow
                                icon="lock-closed"
                                label="Foreground"
                                value={webOrMobileLock}
                                colors={colors as any}
                                isDark={isDark}
                            />
                        </View>
                    </View>

                    {requiresCamera ? (
                        <CameraPreview
                            cameraFacing={cameraFacing}
                            cameraReady={cameraReady}
                            hasPermission={hasCameraPermission}
                            isPermissionLoading={isPermissionLoading}
                            onRequestPermission={requestCameraPermission}
                            onCameraReady={onCameraReady}
                            onCameraMountError={onCameraMountError}
                            onFlip={flipCamera}
                            colors={colors}
                            isDark={isDark}
                        />
                    ) : null}

                    {requiresMicrophone ? (
                        <MicLevelMeter
                            level={micLevel}
                            detected={micDetected}
                            colors={colors}
                            isDark={isDark}
                        />
                    ) : null}
                </View>
            </ScrollView>

            <CheckupCTA colors={colors} isLoading={isStartingSession} onPress={handleStartExam} />
        </View>
    );
}
