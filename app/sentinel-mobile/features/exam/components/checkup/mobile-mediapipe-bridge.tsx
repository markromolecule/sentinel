import React, { useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export type MobileMediaPipeBridgeProps = {
    onLandmarksDetected: (landmarksByFace: any[][], confidenceScore: number) => void;
    onStatusChange?: (status: 'initializing' | 'ready') => void;
    onError?: (error: string) => void;
    frameIntervalMs?: number;
    facing?: 'front' | 'back';
    showPreview?: boolean;
};

export type MobileMediaPipeBridgeRef = {
    takePictureAsync: (options?: { quality?: number }) => Promise<{ uri: string; base64: string }>;
};

export const MobileMediaPipeBridge = forwardRef<MobileMediaPipeBridgeRef, MobileMediaPipeBridgeProps>(
    (
        {
            onLandmarksDetected,
            onStatusChange,
            onError,
            frameIntervalMs = 500,
            facing = 'front',
            showPreview = false,
        },
        ref
    ) => {
        const webViewRef = useRef<WebView>(null);
        const pendingCaptures = useRef<
            Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>
        >(new Map());

        useImperativeHandle(ref, () => ({
            takePictureAsync: async (options = { quality: 0.5 }) => {
                return new Promise((resolve, reject) => {
                    const requestId = Math.random().toString(36).substring(7);
                    pendingCaptures.current.set(requestId, { resolve, reject });
                    if (webViewRef.current) {
                        webViewRef.current.postMessage(
                            JSON.stringify({
                                type: 'capture',
                                requestId,
                                quality: options.quality ?? 0.5,
                            })
                        );
                    } else {
                        reject(new Error('WebView not ready'));
                    }
                });
            },
        }));

        // Update configuration in WebView when props change
        useEffect(() => {
            if (webViewRef.current) {
                webViewRef.current.postMessage(
                    JSON.stringify({
                        type: 'configure',
                        frameIntervalMs,
                        facingMode: facing === 'front' ? 'user' : 'environment',
                    })
                );
            }
        }, [frameIntervalMs, facing]);

        const htmlContent = useMemo(() => {
            return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>MediaPipe Bridge</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: ${showPreview ? 'block' : 'none'};
      ${facing === 'front' ? 'transform: scaleX(-1);' : ''}
    }
  </style>
</head>
<body>
  <video id="webcam" autoplay playsinline muted></video>
  <script type="module">
    import { FilesetResolver, FaceLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/vision_bundle.mjs';

    const video = document.getElementById('webcam');
    let faceLandmarker;
    let running = true;
    let frameIntervalMs = ${frameIntervalMs};
    let facingMode = "${facing === 'front' ? 'user' : 'environment'}";
    let lastProcessedTime = 0;
    let localStream = null;

    function sendToRN(data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    async function initMediaPipe() {
      try {
        sendToRN({ type: 'status', status: 'initializing' });
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
        );
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 2,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          minFaceDetectionConfidence: 0.4,
          minFacePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        });
        sendToRN({ type: 'status', status: 'ready' });
        startCamera();
      } catch (err) {
        sendToRN({ type: 'error', error: 'Failed to initialize FaceLandmarker: ' + err.message });
      }
    }

    async function startCamera() {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        video.srcObject = localStream;
        video.addEventListener('loadeddata', predictLoop);
      } catch (err) {
        sendToRN({ type: 'error', error: 'Camera access failed: ' + err.message });
      }
    }

    function predictLoop() {
      if (!running) return;

      const now = performance.now();
      if (now - lastProcessedTime >= frameIntervalMs && video.readyState >= 3) {
        lastProcessedTime = now;
        try {
          const result = faceLandmarker.detectForVideo(video, now);
          if (result && result.faceLandmarks) {
            sendToRN({
              type: 'landmarks',
              landmarks: result.faceLandmarks,
              confidenceScore: 0.95
            });
          }
        } catch (err) {
          sendToRN({ type: 'error', error: 'Detection failed: ' + err.message });
        }
      }
      requestAnimationFrame(predictLoop);
    }

    window.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'configure') {
          if (msg.frameIntervalMs !== undefined) {
            frameIntervalMs = msg.frameIntervalMs;
          }
          if (msg.facingMode !== undefined && msg.facingMode !== facingMode) {
            facingMode = msg.facingMode;
            startCamera();
          }
        }
        if (msg.type === 'capture') {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', msg.quality || 0.5);
            const base64 = dataUrl.split(',')[1] || '';
            sendToRN({
              type: 'capture_result',
              base64Image: base64,
              requestId: msg.requestId
            });
          } catch (e) {
            sendToRN({ type: 'capture_error', error: e.message, requestId: msg.requestId });
          }
        }
      } catch (e) {}
    });

    initMediaPipe();
  </script>
</body>
</html>
            `;
        }, [frameIntervalMs, facing, showPreview]);

        const webViewSource = useMemo(() => ({
            html: htmlContent,
            baseUrl: 'https://app.sentinelph.tech'
        }), [htmlContent]);

        return (
            <View style={showPreview ? styles.previewContainer : styles.container}>
                <WebView
                    ref={webViewRef}
                    originWhitelist={['*']}
                    source={webViewSource}
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    mediaPlaybackRequiresUserAction={false}
                    allowsInlineMediaPlayback={true}
                    {...({
                        onPermissionRequest: (event: any) => {
                            event.grant(event.resources);
                        }
                    } as any)}
                    onMessage={(event) => {
                        try {
                            const message = JSON.parse(event.nativeEvent.data);
                            if (message.type === 'landmarks') {
                                onLandmarksDetected(message.landmarks, message.confidenceScore);
                            } else if (message.type === 'status') {
                                if (onStatusChange) {
                                    onStatusChange(message.status);
                                }
                            } else if (message.type === 'error') {
                                if (onError) {
                                    onError(message.error);
                                }
                            } else if (message.type === 'capture_result') {
                                const pending = pendingCaptures.current.get(message.requestId);
                                if (pending) {
                                    pending.resolve({
                                        uri: `data:image/jpeg;base64,${message.base64Image}`,
                                        base64: message.base64Image,
                                    });
                                    pendingCaptures.current.delete(message.requestId);
                                }
                            } else if (message.type === 'capture_error') {
                                const pending = pendingCaptures.current.get(message.requestId);
                                if (pending) {
                                    pending.reject(new Error(message.error));
                                    pendingCaptures.current.delete(message.requestId);
                                }
                            }
                        } catch (err) {
                            console.error('Failed to parse WebView message:', err);
                        }
                    }}
                />
            </View>
        );
    }
);

MobileMediaPipeBridge.displayName = 'MobileMediaPipeBridge';

const styles = StyleSheet.create({
    container: {
        width: 1,
        height: 1,
        opacity: 0,
        position: 'absolute',
    },
    previewContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    webview: {
        flex: 1,
    },
});
