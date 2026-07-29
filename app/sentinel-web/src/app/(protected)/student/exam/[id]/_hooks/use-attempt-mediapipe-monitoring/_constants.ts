export const MEDIAPIPE_WASM_PATH =
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
export const MEDIAPIPE_MODEL_PATH =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Bound how many encoded frames can be retained in browser memory while the
// API decides whether an upload is allowed.
export const MAX_PENDING_EVIDENCE_DECISIONS = 3;

// Fail closed if the authoritative decision does not arrive promptly so
// telemetry can fall back without holding frames indefinitely.
export const EVIDENCE_DECISION_TIMEOUT_MS = 10_000;
