// Polyfill DOMException for React Native/Expo environment
if (typeof global.DOMException === 'undefined') {
    // @ts-ignore
    global.DOMException = class DOMException extends Error {
        constructor(message?: string, name?: string) {
            super(message);
            this.name = name || 'DOMException';
        }
    };
}
