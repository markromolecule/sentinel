import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { type CameraPreviewProps } from '@/types/exam';

export function CameraPreview({
    cameraFacing,
    cameraReady,
    hasPermission = true,
    isPermissionLoading = false,
    onRequestPermission,
    onCameraReady,
    onCameraMountError,
    onFlip,
    colors,
    isDark,
}: CameraPreviewProps) {
    return (
        <View style={{ marginBottom: 20 }}>
            <Text
                style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: colors.icon,
                    letterSpacing: 0.8,
                    marginBottom: 14,
                }}
            >
                CAMERA PREVIEW
            </Text>

            <View
                style={{
                    backgroundColor: colors.card,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: colors.border,
                    overflow: 'hidden',
                }}
            >
                {/* Camera Feed */}
                <View
                    style={{
                        height: 300,
                        backgroundColor: isDark ? '#111' : '#f0f0f0',
                        position: 'relative',
                    }}
                >
                    {isPermissionLoading ? (
                        <View
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 20,
                            }}
                        >
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{ marginTop: 12, fontSize: 14, color: colors.icon }}>
                                Checking camera permissions…
                            </Text>
                        </View>
                    ) : !hasPermission ? (
                        <View
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 24,
                                backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(240,240,240,0.5)',
                            }}
                        >
                            <View
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    backgroundColor: colors.primary + '18',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 14,
                                }}
                            >
                                <Ionicons name="camera-outline" size={28} color={colors.primary} />
                            </View>
                            <Text
                                style={{
                                    fontSize: 15,
                                    fontWeight: '700',
                                    color: colors.text,
                                    marginBottom: 6,
                                    textAlign: 'center',
                                }}
                            >
                                Camera Access Required
                            </Text>
                            <Text
                                style={{
                                    fontSize: 13,
                                    color: colors.icon,
                                    textAlign: 'center',
                                    marginBottom: 18,
                                    lineHeight: 18,
                                }}
                            >
                                Please grant camera permission to verify your environment for this exam.
                            </Text>
                            {onRequestPermission ? (
                                <TouchableOpacity
                                    onPress={onRequestPermission}
                                    style={{
                                        backgroundColor: colors.primary,
                                        paddingHorizontal: 18,
                                        paddingVertical: 10,
                                        borderRadius: 12,
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
                                        Grant Permission
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    ) : (
                        <>
                            <CameraView
                                key={`${cameraFacing}-${hasPermission}`}
                                style={{ flex: 1 }}
                                facing={cameraFacing}
                                onCameraReady={onCameraReady}
                                onMountError={onCameraMountError}
                                mirror={cameraFacing === 'front'}
                            />

                            {/* Loading overlay */}
                            {!cameraReady && (
                                <View
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isDark
                                            ? 'rgba(0,0,0,0.7)'
                                            : 'rgba(255,255,255,0.8)',
                                    }}
                                >
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <Text
                                        style={{
                                            marginTop: 10,
                                            fontSize: 13,
                                            color: colors.icon,
                                        }}
                                    >
                                        Initializing camera…
                                    </Text>
                                </View>
                            )}

                            {/* Flip button */}
                            <TouchableOpacity
                                onPress={onFlip}
                                accessibilityLabel="Flip camera"
                                accessibilityRole="button"
                                style={{
                                    position: 'absolute',
                                    bottom: 14,
                                    right: 14,
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: 'rgba(0,0,0,0.45)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="camera-reverse" size={22} color="#fff" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Status bar */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 18,
                        paddingVertical: 14,
                    }}
                >
                    <View
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: !hasPermission
                                ? '#ef4444'
                                : cameraReady
                                  ? '#10b981'
                                  : '#f59e0b',
                            marginRight: 10,
                        }}
                    />
                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: !hasPermission
                                ? '#ef4444'
                                : cameraReady
                                  ? '#10b981'
                                  : '#f59e0b',
                        }}
                    >
                        {!hasPermission
                            ? 'Permission Required'
                            : cameraReady
                              ? 'Camera Ready'
                              : 'Loading…'}
                    </Text>
                </View>
            </View>
        </View>
    );
}
