import { vi, describe, it, expect } from 'vitest';
import React from 'react';

// Mock React to avoid Invalid Hook Call outside of render
let effectCallbacks: Array<() => void | (() => void)> = [];
vi.mock('react', () => {
    const ReactModule = require('react');
    const mockRef = { current: null };
    return {
        default: {
            useRef: (initial: any) => ({ current: initial }),
            useEffect: (callback: () => void | (() => void)) => {
                effectCallbacks.push(callback);
            },
            useImperativeHandle: (ref: any, init: any) => {
                if (ref) {
                    if (typeof ref === 'function') {
                        ref(init());
                    } else {
                        ref.current = init();
                    }
                }
            },
            forwardRef: (render: any) => {
                return (props: any) => render(props, mockRef);
            },
            useMemo: (callback: () => any) => callback(),
        },
        useRef: (initial: any) => ({ current: initial }),
        useEffect: (callback: () => void | (() => void)) => {
            effectCallbacks.push(callback);
        },
        useImperativeHandle: (ref: any, init: any) => {
            if (ref) {
                if (typeof ref === 'function') {
                    ref(init());
                } else {
                    ref.current = init();
                }
            }
        },
        forwardRef: (render: any) => {
            return (props: any) => render(props, mockRef);
        },
        useMemo: (callback: () => any) => callback(),
    };
});

// Mock WebView
const mockPostMessage = vi.fn();
vi.mock('react-native-webview', () => {
    const ReactModule = require('react');
    class WebView extends ReactModule.Component<any> {
        postMessage = mockPostMessage;
        render() {
            return { type: 'WebView', props: this.props };
        }
    }
    return { WebView };
});

vi.mock('react-native', () => {
    return {
        View: (props: any) => ({ type: 'View', props }),
        StyleSheet: {
            create: (styles: any) => styles,
        },
    };
});

import { MobileMediaPipeBridge } from './mobile-mediapipe-bridge';

describe('MobileMediaPipeBridge', () => {
    it('renders WebView with correct props', () => {
        const onLandmarks = vi.fn();
        const result = MobileMediaPipeBridge({
            onLandmarksDetected: onLandmarks,
            facing: 'front',
            frameIntervalMs: 300,
        });

        expect(result).not.toBeNull();
        const webview = (result as any).props.children;
        expect(webview).toBeDefined();
        expect(webview.props.javaScriptEnabled).toBe(true);
        expect(webview.props.allowsInlineMediaPlayback).toBe(true);
    });

    it('invokes callbacks on messages received from WebView', () => {
        const onLandmarks = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        const result = MobileMediaPipeBridge({
            onLandmarksDetected: onLandmarks,
            onStatusChange: onStatus,
            onError: onError,
        });

        const webview = (result as any).props.children;

        // Simulate status change message
        webview.props.onMessage({
            nativeEvent: {
                data: JSON.stringify({ type: 'status', status: 'ready' }),
            },
        });
        expect(onStatus).toHaveBeenCalledWith('ready');

        // Simulate error message
        webview.props.onMessage({
            nativeEvent: {
                data: JSON.stringify({ type: 'error', error: 'Camera permission denied' }),
            },
        });
        expect(onError).toHaveBeenCalledWith('Camera permission denied');

        // Simulate landmark message
        const mockLandmarks = [[{ x: 0.5, y: 0.5, z: 0 }]];
        webview.props.onMessage({
            nativeEvent: {
                data: JSON.stringify({
                    type: 'landmarks',
                    landmarks: mockLandmarks,
                    confidenceScore: 0.9,
                }),
            },
        });
        expect(onLandmarks).toHaveBeenCalledWith(mockLandmarks, 0.9);
    });
});
