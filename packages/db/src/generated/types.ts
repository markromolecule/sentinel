import type { ColumnType } from 'kysely';
export type Generated<T> =
    T extends ColumnType<infer S, infer I, infer U>
        ? ColumnType<S, I | undefined, U>
        : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export const enrollment_request_status = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const;
export type enrollment_request_status =
    (typeof enrollment_request_status)[keyof typeof enrollment_request_status];
export const subject_offering_status = {
    DRAFT: 'DRAFT',
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
    ARCHIVED: 'ARCHIVED',
} as const;
export type subject_offering_status =
    (typeof subject_offering_status)[keyof typeof subject_offering_status];
export const aal_level = {
    aal1: 'aal1',
    aal2: 'aal2',
    aal3: 'aal3',
} as const;
export type aal_level = (typeof aal_level)[keyof typeof aal_level];
export const code_challenge_method = {
    s256: 's256',
    plain: 'plain',
} as const;
export type code_challenge_method =
    (typeof code_challenge_method)[keyof typeof code_challenge_method];
export const factor_status = {
    unverified: 'unverified',
    verified: 'verified',
} as const;
export type factor_status = (typeof factor_status)[keyof typeof factor_status];
export const factor_type = {
    totp: 'totp',
    webauthn: 'webauthn',
    phone: 'phone',
} as const;
export type factor_type = (typeof factor_type)[keyof typeof factor_type];
export const oauth_authorization_status = {
    pending: 'pending',
    approved: 'approved',
    denied: 'denied',
    expired: 'expired',
} as const;
export type oauth_authorization_status =
    (typeof oauth_authorization_status)[keyof typeof oauth_authorization_status];
export const oauth_client_type = {
    public: 'public',
    confidential: 'confidential',
} as const;
export type oauth_client_type = (typeof oauth_client_type)[keyof typeof oauth_client_type];
export const oauth_registration_type = {
    dynamic: 'dynamic',
    manual: 'manual',
} as const;
export type oauth_registration_type =
    (typeof oauth_registration_type)[keyof typeof oauth_registration_type];
export const oauth_response_type = {
    code: 'code',
} as const;
export type oauth_response_type = (typeof oauth_response_type)[keyof typeof oauth_response_type];
export const one_time_token_type = {
    confirmation_token: 'confirmation_token',
    reauthentication_token: 'reauthentication_token',
    recovery_token: 'recovery_token',
    email_change_token_new: 'email_change_token_new',
    email_change_token_current: 'email_change_token_current',
    phone_change_token: 'phone_change_token',
} as const;
export type one_time_token_type = (typeof one_time_token_type)[keyof typeof one_time_token_type];
export const user_status = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
} as const;
export type user_status = (typeof user_status)[keyof typeof user_status];
export const student_whitelist_status = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    ARCHIVED: 'ARCHIVED',
} as const;
export type student_whitelist_status =
    (typeof student_whitelist_status)[keyof typeof student_whitelist_status];
export const question_type = {
    MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
    IDENTIFICATION: 'IDENTIFICATION',
    ESSAY: 'ESSAY',
    ENUMERATION: 'ENUMERATION',
    TRUE_FALSE: 'TRUE_FALSE',
    MULTIPLE_RESPONSE: 'MULTIPLE_RESPONSE',
    MATCHING: 'MATCHING',
    FILL_BLANK: 'FILL_BLANK',
} as const;
export type question_type = (typeof question_type)[keyof typeof question_type];
export const question_difficulty = {
    EASY: 'EASY',
    MODERATE: 'MODERATE',
    HARD: 'HARD',
} as const;
export type question_difficulty = (typeof question_difficulty)[keyof typeof question_difficulty];
export const question_bank_status = {
    ACTIVE: 'ACTIVE',
    RETIRED: 'RETIRED',
    COOLING_OFF: 'COOLING_OFF',
    ARCHIVED: 'ARCHIVED',
} as const;
export type question_bank_status = (typeof question_bank_status)[keyof typeof question_bank_status];
export const exam_difficulty = {
    EASY: 'EASY',
    MEDIUM: 'MEDIUM',
    HARD: 'HARD',
} as const;
export type exam_difficulty = (typeof exam_difficulty)[keyof typeof exam_difficulty];
export const exam_lobby_admission_mode = {
    AUTOMATIC: 'AUTOMATIC',
    INSTRUCTOR_GATED: 'INSTRUCTOR_GATED',
} as const;
export type exam_lobby_admission_mode =
    (typeof exam_lobby_admission_mode)[keyof typeof exam_lobby_admission_mode];
export const exam_lobby_admission_status = {
    WAITING: 'WAITING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const;
export type exam_lobby_admission_status =
    (typeof exam_lobby_admission_status)[keyof typeof exam_lobby_admission_status];
export const exam_status = {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    ARCHIVED: 'ARCHIVED',
    SCHEDULED: 'SCHEDULED',
    AVAILABLE: 'AVAILABLE',
    COMPLETED: 'COMPLETED',
    IN_PROGRESS: 'IN_PROGRESS',
    UPCOMING: 'UPCOMING',
    ACTIVE: 'ACTIVE',
} as const;
export type exam_status = (typeof exam_status)[keyof typeof exam_status];
export const exam_attempt_lifecycle_state = {
    IN_PROGRESS: 'IN_PROGRESS',
    LOCKED: 'LOCKED',
    CLOSED: 'CLOSED',
    SUBMITTED: 'SUBMITTED',
    SUPERSEDED: 'SUPERSEDED',
} as const;
export type exam_attempt_lifecycle_state =
    (typeof exam_attempt_lifecycle_state)[keyof typeof exam_attempt_lifecycle_state];
export const exam_attempt_lifecycle_event_type = {
    STARTED: 'STARTED',
    SUBMITTED: 'SUBMITTED',
    LOCKED: 'LOCKED',
    REOPENED: 'REOPENED',
    RESET: 'RESET',
    CLOSED: 'CLOSED',
    SUPERSEDED: 'SUPERSEDED',
    FINALIZED: 'FINALIZED',
    FINALIZATION_REVISED: 'FINALIZATION_REVISED',
    MAKEUP_GRANTED: 'MAKEUP_GRANTED',
    RETAKE_GRANTED: 'RETAKE_GRANTED',
    INCIDENT_REVIEWED: 'INCIDENT_REVIEWED',
} as const;
export type exam_attempt_lifecycle_event_type =
    (typeof exam_attempt_lifecycle_event_type)[keyof typeof exam_attempt_lifecycle_event_type];
export const exam_attempt_score_state = {
    DRAFT: 'DRAFT',
    FINALIZED: 'FINALIZED',
    REVISION_REQUIRED: 'REVISION_REQUIRED',
} as const;
export type exam_attempt_score_state =
    (typeof exam_attempt_score_state)[keyof typeof exam_attempt_score_state];
export const live_inspection_lease_state = {
    REQUESTED: 'REQUESTED',
    PUBLISHER_CONNECTING: 'PUBLISHER_CONNECTING',
    PUBLISHER_READY: 'PUBLISHER_READY',
    LIVE: 'LIVE',
    STOPPING: 'STOPPING',
    ENDED: 'ENDED',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
} as const;
export type live_inspection_lease_state =
    (typeof live_inspection_lease_state)[keyof typeof live_inspection_lease_state];
export const live_inspection_terminal_reason = {
    VIEWER_STOPPED: 'VIEWER_STOPPED',
    STUDENT_DISCONNECTED: 'STUDENT_DISCONNECTED',
    VIEWER_DISCONNECTED: 'VIEWER_DISCONNECTED',
    TIME_LIMIT_REACHED: 'TIME_LIMIT_REACHED',
    TOKEN_ERROR: 'TOKEN_ERROR',
    PROVIDER_ERROR: 'PROVIDER_ERROR',
    EXAM_ENDED: 'EXAM_ENDED',
    LEASE_EXPIRED: 'LEASE_EXPIRED',
} as const;
export type live_inspection_terminal_reason =
    (typeof live_inspection_terminal_reason)[keyof typeof live_inspection_terminal_reason];
export const proctor_assignment_status = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    DECLINED: 'DECLINED',
    ACTIVE: 'ACTIVE',
    COMPLETED: 'COMPLETED',
    SCHEDULED: 'SCHEDULED',
} as const;
export type proctor_assignment_status =
    (typeof proctor_assignment_status)[keyof typeof proctor_assignment_status];
export const notification_status = {
    UNREAD: 'UNREAD',
    READ: 'READ',
} as const;
export type notification_status = (typeof notification_status)[keyof typeof notification_status];
export const notification_resource_type = {
    EXAM_ASSIGNMENT: 'EXAM_ASSIGNMENT',
    CLASSROOM_INSTRUCTOR_ASSIGNMENT: 'CLASSROOM_INSTRUCTOR_ASSIGNMENT',
    QUESTION_BANK_COLLECTION: 'QUESTION_BANK_COLLECTION',
    SUBJECT_ENROLLMENT_REQUEST: 'SUBJECT_ENROLLMENT_REQUEST',
    SECTION: 'SECTION',
    SUBJECT: 'SUBJECT',
    SUBJECT_CLASSIFICATION: 'SUBJECT_CLASSIFICATION',
    SUPPORT_OPERATION: 'SUPPORT_OPERATION',
    INSTITUTION_ACTIVITY: 'INSTITUTION_ACTIVITY',
    INSTRUCTOR_SUBJECT_REQUEST: 'INSTRUCTOR_SUBJECT_REQUEST',
    ANNOUNCEMENT: 'ANNOUNCEMENT',
} as const;
export type notification_resource_type =
    (typeof notification_resource_type)[keyof typeof notification_resource_type];
export const notification_action_type = {
    EXAM_ASSIGNMENT_CREATED: 'EXAM_ASSIGNMENT_CREATED',
    EXAM_ASSIGNMENT_ACCEPTED: 'EXAM_ASSIGNMENT_ACCEPTED',
    EXAM_ASSIGNMENT_REJECTED: 'EXAM_ASSIGNMENT_REJECTED',
    CLASSROOM_INSTRUCTOR_ASSIGNED: 'CLASSROOM_INSTRUCTOR_ASSIGNED',
    CLASSROOM_INSTRUCTOR_UNASSIGNED: 'CLASSROOM_INSTRUCTOR_UNASSIGNED',
    CLASSROOM_INSTRUCTOR_ASSIGNMENT_ACKNOWLEDGED: 'CLASSROOM_INSTRUCTOR_ASSIGNMENT_ACKNOWLEDGED',
    CLASSROOM_INSTRUCTOR_ASSIGNMENT_FLAGGED: 'CLASSROOM_INSTRUCTOR_ASSIGNMENT_FLAGGED',
    QUESTION_BANK_COLLECTION_ASSIGNED: 'QUESTION_BANK_COLLECTION_ASSIGNED',
    SUBJECT_ENROLLMENT_REQUEST_SUBMITTED: 'SUBJECT_ENROLLMENT_REQUEST_SUBMITTED',
    SUBJECT_ENROLLMENT_REQUEST_APPROVED: 'SUBJECT_ENROLLMENT_REQUEST_APPROVED',
    SUBJECT_ENROLLMENT_REQUEST_REJECTED: 'SUBJECT_ENROLLMENT_REQUEST_REJECTED',
    SECTION_CREATED: 'SECTION_CREATED',
    SECTION_UPDATED: 'SECTION_UPDATED',
    SECTION_DELETED: 'SECTION_DELETED',
    SUBJECT_CREATED: 'SUBJECT_CREATED',
    SUBJECT_UPDATED: 'SUBJECT_UPDATED',
    SUBJECT_DELETED: 'SUBJECT_DELETED',
    SUBJECT_CLASSIFICATION_CREATED: 'SUBJECT_CLASSIFICATION_CREATED',
    SUBJECT_CLASSIFICATION_UPDATED: 'SUBJECT_CLASSIFICATION_UPDATED',
    SUBJECT_CLASSIFICATION_DELETED: 'SUBJECT_CLASSIFICATION_DELETED',
    SUPPORT_OPERATION_COMPLETED: 'SUPPORT_OPERATION_COMPLETED',
    INSTITUTION_ACTIVITY_CREATED: 'INSTITUTION_ACTIVITY_CREATED',
    INSTITUTION_ACTIVITY_UPDATED: 'INSTITUTION_ACTIVITY_UPDATED',
    INSTITUTION_ACTIVITY_DELETED: 'INSTITUTION_ACTIVITY_DELETED',
    INSTITUTION_ACTIVITY_TRANSACTION_COMPLETED: 'INSTITUTION_ACTIVITY_TRANSACTION_COMPLETED',
    INSTITUTION_ACTIVITY_OVERRIDE_COMPLETED: 'INSTITUTION_ACTIVITY_OVERRIDE_COMPLETED',
    INSTRUCTOR_SUBJECT_REQUEST_SUBMITTED: 'INSTRUCTOR_SUBJECT_REQUEST_SUBMITTED',
    INSTRUCTOR_SUBJECT_REQUEST_APPROVED: 'INSTRUCTOR_SUBJECT_REQUEST_APPROVED',
    INSTRUCTOR_SUBJECT_REQUEST_REJECTED: 'INSTRUCTOR_SUBJECT_REQUEST_REJECTED',
    ANNOUNCEMENT_PUBLISHED: 'ANNOUNCEMENT_PUBLISHED',
    ANNOUNCEMENT_UPDATED: 'ANNOUNCEMENT_UPDATED',
} as const;
export type notification_action_type =
    (typeof notification_action_type)[keyof typeof notification_action_type];
export const assignment_status = {
    ACTIVE: 'ACTIVE',
    PENDING_ACK: 'PENDING_ACK',
    ACKNOWLEDGED: 'ACKNOWLEDGED',
    FLAGGED: 'FLAGGED',
    REMOVED: 'REMOVED',
} as const;
export type assignment_status = (typeof assignment_status)[keyof typeof assignment_status];
export const instructor_request_status = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    WAITLISTED: 'WAITLISTED',
    CANCELLED: 'CANCELLED',
} as const;
export type instructor_request_status =
    (typeof instructor_request_status)[keyof typeof instructor_request_status];
export const announcement_status = {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    SCHEDULED: 'SCHEDULED',
    ARCHIVED: 'ARCHIVED',
} as const;
export type announcement_status = (typeof announcement_status)[keyof typeof announcement_status];
export const message_status = {
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    READ: 'READ',
} as const;
export type message_status = (typeof message_status)[keyof typeof message_status];
export const action_type = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    SUCCESS: 'SUCCESS',
} as const;
export type action_type = (typeof action_type)[keyof typeof action_type];
export const incident_severity = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
} as const;
export type incident_severity = (typeof incident_severity)[keyof typeof incident_severity];
export const incident_type = {
    FACE_NOT_VISIBLE: 'FACE_NOT_VISIBLE',
    MULTIPLE_FACES: 'MULTIPLE_FACES',
    TAB_SWITCH: 'TAB_SWITCH',
    AUDIO_DETECTED: 'AUDIO_DETECTED',
    SUSPICIOUS_MOVEMENT: 'SUSPICIOUS_MOVEMENT',
    SCREENSHOT: 'SCREENSHOT',
    SCREEN_RECORD: 'SCREEN_RECORD',
    GAZE: 'GAZE',
    APP_BACKGROUNDING: 'APP_BACKGROUNDING',
    ROOT_JAILBREAK_DETECTED: 'ROOT_JAILBREAK_DETECTED',
    APP_PINNING_VIOLATION: 'APP_PINNING_VIOLATION',
    NOTIFICATION_BLOCK_VIOLATION: 'NOTIFICATION_BLOCK_VIOLATION',
} as const;
export type incident_type = (typeof incident_type)[keyof typeof incident_type];
export const incident_platform = {
    WEB: 'WEB',
    MOBILE: 'MOBILE',
} as const;
export type incident_platform = (typeof incident_platform)[keyof typeof incident_platform];
export const telemetry_source = {
    CLIENT: 'CLIENT',
    SERVER: 'SERVER',
    AI: 'AI',
} as const;
export type telemetry_source = (typeof telemetry_source)[keyof typeof telemetry_source];
export const trend_direction = {
    UP: 'UP',
    DOWN: 'DOWN',
    NEUTRAL: 'NEUTRAL',
} as const;
export type trend_direction = (typeof trend_direction)[keyof typeof trend_direction];
export const room_type = {
    LECTURE: 'LECTURE',
    LABORATORY: 'LABORATORY',
    VIRTUAL: 'VIRTUAL',
} as const;
export type room_type = (typeof room_type)[keyof typeof room_type];
export const room_status = {
    AVAILABLE: 'AVAILABLE',
    ASSIGNED: 'ASSIGNED',
    MAINTENANCE: 'MAINTENANCE',
} as const;
export type room_status = (typeof room_status)[keyof typeof room_status];
export const institution_kind = {
    STANDALONE: 'STANDALONE',
    PARENT: 'PARENT',
    CHILD: 'CHILD',
} as const;
export type institution_kind = (typeof institution_kind)[keyof typeof institution_kind];
export const inheritance_status = {
    LOCAL: 'LOCAL',
    OVERRIDDEN: 'OVERRIDDEN',
    HIDDEN: 'HIDDEN',
} as const;
export type inheritance_status = (typeof inheritance_status)[keyof typeof inheritance_status];
export const calendar_event_type = {
    EVENT: 'EVENT',
    ANNOUNCEMENT: 'ANNOUNCEMENT',
    MAINTENANCE: 'MAINTENANCE',
    HOLIDAY: 'HOLIDAY',
    NOTE: 'NOTE',
} as const;
export type calendar_event_type = (typeof calendar_event_type)[keyof typeof calendar_event_type];
export const calendar_event_audience = {
    ALL: 'ALL',
    STUDENTS: 'STUDENTS',
    INSTRUCTORS: 'INSTRUCTORS',
    ADMINS: 'ADMINS',
    SPECIFIC_GROUP: 'SPECIFIC_GROUP',
} as const;
export type calendar_event_audience =
    (typeof calendar_event_audience)[keyof typeof calendar_event_audience];
export const exam_category = {
    CLASSROOM: 'CLASSROOM',
    MAJOR: 'MAJOR',
} as const;
export type exam_category = (typeof exam_category)[keyof typeof exam_category];
export const release_score_mode = {
    AUTO_RELEASE: 'AUTO_RELEASE',
    MANUAL_RELEASE: 'MANUAL_RELEASE',
} as const;
export type release_score_mode = (typeof release_score_mode)[keyof typeof release_score_mode];
export const exam_remediation_type = {
    RETAKE: 'RETAKE',
    MAKEUP: 'MAKEUP',
} as const;
export type exam_remediation_type =
    (typeof exam_remediation_type)[keyof typeof exam_remediation_type];
export const telemetry_incident_evidence_state = {
    PENDING_UPLOAD: 'PENDING_UPLOAD',
    AVAILABLE: 'AVAILABLE',
    DELETE_PENDING: 'DELETE_PENDING',
    DELETED: 'DELETED',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
} as const;
export type telemetry_incident_evidence_state =
    (typeof telemetry_incident_evidence_state)[keyof typeof telemetry_incident_evidence_state];
export const telemetry_incident_evidence_deletion_reason = {
    INSTRUCTOR_REVIEW: 'INSTRUCTOR_REVIEW',
    RETENTION_EXPIRED: 'RETENTION_EXPIRED',
    ATTEMPT_DELETED: 'ATTEMPT_DELETED',
    STALE_PENDING_UPLOAD: 'STALE_PENDING_UPLOAD',
    TELEMETRY_UNLINKED: 'TELEMETRY_UNLINKED',
    OBJECT_MISSING: 'OBJECT_MISSING',
} as const;
export type telemetry_incident_evidence_deletion_reason =
    (typeof telemetry_incident_evidence_deletion_reason)[keyof typeof telemetry_incident_evidence_deletion_reason];
export type analytics_reports = {
    report_id: Generated<string>;
    title: string;
    type: string;
    generated_at: Generated<Timestamp | null>;
    format: Generated<string | null>;
    status: Generated<string | null>;
    file_url: string | null;
    created_by: string | null;
    institution_id: string | null;
    period_start_at: Timestamp | null;
    period_end_at: Timestamp | null;
    timezone: string | null;
    template_id: string | null;
    template_snapshot: unknown | null;
    storage_bucket: string | null;
    storage_path: string | null;
    failure_code: string | null;
    failure_message: string | null;
    started_at: Timestamp | null;
    completed_at: Timestamp | null;
    expires_at: Timestamp | null;
    retry_count: Generated<number>;
    request_snapshot: unknown | null;
};
export type announcements = {
    id: Generated<string>;
    title: string;
    slug: string;
    content: string;
    published_at: Timestamp | null;
    unpublished_at: Timestamp | null;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
    deleted_at: Timestamp | null;
    author_id: string | null;
    institution_id: string | null;
};
export type audit_log_entries = {
    instance_id: string | null;
    id: string;
    payload: unknown | null;
    created_at: Timestamp | null;
    ip_address: Generated<string>;
};
export type audit_logs = {
    log_id: Generated<string>;
    user_id: string | null;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    details: unknown | null;
    ip_address: string | null;
    created_at: Generated<Timestamp | null>;
    institution_id: string | null;
    branch_id: string | null;
};
export type calendar_events = {
    event_id: Generated<string>;
    institution_id: string;
    title: string;
    description: string | null;
    event_type: Generated<calendar_event_type>;
    target_audience: Generated<calendar_event_audience>;
    start_date: Timestamp;
    end_date: Timestamp | null;
    start_time: string | null;
    end_time: string | null;
    created_by: string | null;
    updated_by: string | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type class_groups = {
    class_group_id: Generated<string>;
    subject_id: string | null;
    section_id: string | null;
    term_id: string | null;
    created_at: Generated<Timestamp | null>;
    institution_id: string | null;
    subject_offering_id: string | null;
    class_name: string | null;
    updated_at: Timestamp | null;
    updated_by: string | null;
    archived_at: Timestamp | null;
};
export type class_roles = {
    class_group_id: string;
    user_id: string;
    role_id: number;
    assigned_at: Generated<Timestamp | null>;
};
export type classroom_instructor_assignments = {
    assignment_id: Generated<string>;
    class_group_id: string;
    instructor_user_id: string;
    assigned_by_user_id: string | null;
    is_head: Generated<boolean>;
    status: Generated<assignment_status>;
    responded_at: Timestamp | null;
    justification: string | null;
    flag_reason: string | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type conversation_participants = {
    conversation_id: string;
    user_id: string;
    joined_at: Generated<Timestamp | null>;
    last_read_at: Timestamp | null;
};
export type conversations = {
    conversation_id: Generated<string>;
    type: Generated<string | null>;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type course_subjects = {
    course_id: string;
    subject_id: string;
    year_level: number | null;
    semester: string | null;
};
export type courses = {
    course_id: Generated<string>;
    code: string;
    title: string;
    department_id: string | null;
    description: string | null;
    created_by: string | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    updated_by: string | null;
    institution_id: string | null;
    source_record_id: string | null;
    inheritance_status: Generated<inheritance_status | null>;
    overridden_at: Timestamp | null;
    overridden_by: string | null;
    hidden_at: Timestamp | null;
    hidden_by: string | null;
};
export type custom_oauth_providers = {
    id: Generated<string>;
    provider_type: string;
    identifier: string;
    name: string;
    client_id: string;
    client_secret: string;
    acceptable_client_ids: Generated<string[]>;
    scopes: Generated<string[]>;
    pkce_enabled: Generated<boolean>;
    attribute_mapping: Generated<unknown>;
    authorization_params: Generated<unknown>;
    enabled: Generated<boolean>;
    email_optional: Generated<boolean>;
    issuer: string | null;
    discovery_url: string | null;
    skip_nonce_check: Generated<boolean>;
    cached_discovery: unknown | null;
    discovery_cached_at: Timestamp | null;
    authorization_url: string | null;
    token_url: string | null;
    userinfo_url: string | null;
    jwks_uri: string | null;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
};
export type departments = {
    department_id: Generated<string>;
    department_name: string;
    department_code: string | null;
    created_at: Timestamp | null;
    created_by: string | null;
    updated_at: Timestamp | null;
    updated_by: string | null;
    institution_id: string | null;
    source_record_id: string | null;
    inheritance_status: Generated<inheritance_status | null>;
    overridden_at: Timestamp | null;
    overridden_by: string | null;
    hidden_at: Timestamp | null;
    hidden_by: string | null;
};
export type enrollment_requests = {
    request_id: Generated<string>;
    class_group_id: string;
    user_id: string;
    status: Generated<enrollment_request_status>;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    approved_by: string | null;
};
export type enrollments = {
    enrollment_id: Generated<string>;
    class_group_id: string | null;
    student_id: string | null;
    enrolled_at: Generated<Timestamp | null>;
};
export type exam_answer_key_exports = {
    export_id: Generated<string>;
    exam_id: string;
    institution_id: string;
    template_id: string;
    template_snapshot: unknown;
    storage_bucket: string | null;
    storage_path: string | null;
    status: Generated<string>;
    failure_code: string | null;
    failure_message: string | null;
    retry_count: Generated<number>;
    request_snapshot: unknown | null;
    created_by: string | null;
    started_at: Timestamp | null;
    completed_at: Timestamp | null;
    expires_at: Timestamp | null;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
};
export type exam_assigned_sections = {
    exam_id: string;
    section_id: string;
    created_at: Generated<Timestamp | null>;
};
export type exam_attempt_lifecycle_events = {
    event_id: Generated<string>;
    attempt_id: string;
    exam_id: string;
    student_id: string;
    event_type: exam_attempt_lifecycle_event_type;
    previous_state: exam_attempt_lifecycle_state | null;
    next_state: exam_attempt_lifecycle_state | null;
    actor_user_id: string | null;
    reason_code: string | null;
    notes: string | null;
    related_incident_ids: unknown | null;
    related_override_id: string | null;
    metadata: unknown | null;
    created_at: Generated<Timestamp | null>;
};
export type exam_attempts = {
    attempt_id: Generated<string>;
    exam_id: string | null;
    student_id: string | null;
    started_at: Generated<Timestamp | null>;
    completed_at: Timestamp | null;
    score: number | null;
    total_score: number | null;
    /**
     * Auto-graded score at time of submission, before any instructor overrides. Write-once.
     */
    initial_score: number | null;
    /**
     * Frozen attempt-time assessment payload used as the source of truth for scoring and reports.
     */
    assessment_snapshot: unknown | null;
    /**
     * Persisted item-level scoring payload derived from assessment_snapshot.
     */
    score_snapshot: unknown | null;
    /**
     * Version label for the scoring pipeline that generated score_snapshot.
     */
    scoring_version: string | null;
    status: Generated<exam_status | null>;
    time_spent_minutes: Generated<number | null>;
    is_verified: Generated<boolean | null>;
    created_at: Generated<Timestamp | null>;
    answered_question_count: Generated<number | null>;
    answer_snapshot: unknown | null;
    last_synced_at: Timestamp | null;
    reconnect_attempt_count: Generated<number | null>;
    last_reconnect_request_id: string | null;
    lifecycle_state: Generated<exam_attempt_lifecycle_state | null>;
    lifecycle_reason: string | null;
    lifecycle_note: string | null;
    locked_at: Timestamp | null;
    locked_by: string | null;
    reopened_until: Timestamp | null;
    closed_at: Timestamp | null;
    closed_by: string | null;
    closed_reason: string | null;
    superseded_by_attempt_id: string | null;
    superseded_at: Timestamp | null;
    superseded_by: string | null;
    finalized_at: Timestamp | null;
    finalized_by: string | null;
    score_state: Generated<exam_attempt_score_state | null>;
};
export type exam_configurations = {
    config_id: Generated<string>;
    exam_id: string | null;
    max_reconnect_attempts: number | null;
    strict_mode: boolean | null;
    camera_required: boolean | null;
    mic_required: boolean | null;
    screen_lock: boolean | null;
    auto_submit_timeout_minutes: number | null;
    allowed_devices: string[];
    ai_rules: Generated<unknown | null>;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    shuffle_questions: boolean | null;
    show_correct_answers: boolean | null;
    allow_review: boolean | null;
    randomize_choices: boolean | null;
    web_security: Generated<unknown | null>;
    mobile_security: Generated<unknown | null>;
    lobby_admission_mode: exam_lobby_admission_mode | null;
    release_score_mode: Generated<release_score_mode | null>;
};
export type exam_feedbacks = {
    feedback_id: Generated<string>;
    attempt_id: string;
    exam_id: string | null;
    student_id: string | null;
    institution_id: string | null;
    rating: number;
    experience: string | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Generated<Timestamp | null>;
};
export type exam_lobby_admissions = {
    admission_id: Generated<string>;
    exam_id: string;
    student_id: string;
    status: Generated<exam_lobby_admission_status | null>;
    checked_in_at: Generated<Timestamp | null>;
    decided_at: Timestamp | null;
    decided_by: string | null;
};
export type exam_questions = {
    question_id: Generated<string>;
    exam_id: string;
    question_type: question_type;
    content: unknown;
    passage_content: string | null;
    passage_type: Generated<string | null>;
    points: Generated<number>;
    order_index: Generated<number>;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    exam_section_id: string | null;
    source_question_bank_question_id: string | null;
    source_collection_id: string | null;
};
export type exam_remediation_schedules = {
    remediation_id: Generated<string>;
    source_exam_id: string;
    remediation_exam_id: string;
    student_id: string;
    source_attempt_id: string | null;
    remediation_type: exam_remediation_type;
    scheduled_date: Timestamp;
    end_date_time: Timestamp;
    created_by: string;
    created_at: Generated<Timestamp>;
    notes: string | null;
};
export type exam_section_assignments = {
    id: Generated<string>;
    exam_id: string;
    section_id: string;
    class_group_id: string | null;
    room_id: string | null;
    instructor_id: string | null;
    scheduled_at: Timestamp | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type exam_sections = {
    exam_section_id: Generated<string>;
    exam_id: string;
    title: string;
    order_index: Generated<number>;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    description: string | null;
    question_type: question_type | null;
};
export type exam_shares = {
    exam_id: string;
    user_id: string;
    created_at: Generated<Timestamp | null>;
};
export type exams = {
    exam_id: Generated<string>;
    title: string;
    subject_id: string | null;
    description: string | null;
    duration_minutes: Generated<number>;
    question_count: Generated<number | null>;
    passing_score: number | null;
    difficulty: Generated<exam_difficulty | null>;
    scheduled_date: Timestamp | null;
    status: Generated<exam_status | null>;
    created_by: string | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    institution_id: string | null;
    section_id: string | null;
    section_name: string | null;
    end_date_time: Timestamp | null;
    updated_by: string | null;
    published_at: Timestamp | null;
    published_by: string | null;
    is_public: Generated<boolean>;
    room_id: string | null;
    exam_category: Generated<exam_category | null>;
    class_group_id: string | null;
};
export type flagged_incidents = {
    incident_id: Generated<string>;
    attempt_id: string | null;
    incident_type: incident_type;
    severity: Generated<incident_severity | null>;
    details: string | null;
    timestamp: Generated<Timestamp | null>;
    evidence_url: string | null;
    status: Generated<string | null>;
    platform: incident_platform | null;
    source: telemetry_source | null;
    rule_key: string | null;
    reviewed_by: string | null;
    reviewed_at: Timestamp | null;
    review_notes: string | null;
    configuration_snapshot: unknown | null;
    session_context: unknown | null;
    dedupe_key: string | null;
};
export type flow_state = {
    id: string;
    user_id: string | null;
    auth_code: string | null;
    code_challenge_method: code_challenge_method | null;
    code_challenge: string | null;
    provider_type: string;
    provider_access_token: string | null;
    provider_refresh_token: string | null;
    created_at: Timestamp | null;
    updated_at: Timestamp | null;
    authentication_method: string;
    auth_code_issued_at: Timestamp | null;
    invite_token: string | null;
    referrer: string | null;
    oauth_client_state_id: string | null;
    linking_target_id: string | null;
    email_optional: Generated<boolean>;
};
export type identities = {
    provider_id: string;
    user_id: string;
    identity_data: unknown;
    provider: string;
    last_sign_in_at: Timestamp | null;
    created_at: Timestamp | null;
    updated_at: Timestamp | null;
    email: Generated<string | null>;
    id: Generated<string>;
};
export type instances = {
    id: string;
    uuid: string | null;
    raw_base_config: string | null;
    created_at: Timestamp | null;
    updated_at: Timestamp | null;
};
export type institution_naming_conventions = {
    institution_naming_convention_id: Generated<string>;
    institution_id: string;
    section_code_format: string | null;
    room_code_format: string | null;
    naming_rules: unknown | null;
    created_at: Generated<Timestamp | null>;
    created_by: string | null;
    updated_at: Timestamp | null;
    updated_by: string | null;
};
export type institution_pdf_branding = {
    institution_id: string;
    logo_storage_bucket: string;
    logo_storage_path: string;
    logo_mime_type: string;
    logo_size_bytes: number;
    logo_hash_sha256: string;
    logo_original_name: string;
    updated_by: string | null;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
};
export type institutions = {
    id: Generated<string>;
    name: string;
    code: string | null;
    created_at: Generated<Timestamp | null>;
    created_by: string | null;
    updated_at: Timestamp | null;
    updated_by: string | null;
    parent_institution_id: string | null;
    institution_kind: Generated<institution_kind>;
};
export type instructor_courses = {
    instructor_id: string;
    course_id: string;
    created_at: Generated<Timestamp | null>;
};
export type instructor_subject_requests = {
    request_id: Generated<string>;
    instructor_id: string;
    subject_id: string;
    status: Generated<instructor_request_status>;
    justification: string | null;
    reviewer_user_id: string | null;
    reviewed_at: Timestamp | null;
    review_comments: string | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type instructor_subjects = {
    instructor_subject_id: Generated<string>;
    instructor_id: string;
    subject_id: string;
    assigned_by_user_id: string | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type instructors = {
    instructor_id: Generated<string>;
    user_id: string | null;
    employee_number: string;
    department_id: string | null;
    institution_id: string | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    course_id: string | null;
};
export type live_inspection_leases = {
    lease_id: Generated<string>;
    exam_id: string;
    attempt_id: string;
    student_user_id: string;
    viewer_user_id: string;
    institution_id: string;
    provider_room_name: string;
    state: Generated<live_inspection_lease_state>;
    version: Generated<number>;
    requested_at: Generated<Timestamp>;
    publisher_connecting_at: Timestamp | null;
    publisher_ready_at: Timestamp | null;
    started_at: Timestamp | null;
    stopping_at: Timestamp | null;
    ended_at: Timestamp | null;
    expires_at: Timestamp;
    end_reason: live_inspection_terminal_reason | null;
    last_error_code: string | null;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
};
export type livekit_webhook_events = {
    provider_event_id: string;
    lease_id: string | null;
    event_type: string;
    received_at: Generated<Timestamp>;
    processed_at: Timestamp | null;
    processing_result: string | null;
};
export type messages = {
    message_id: Generated<string>;
    conversation_id: string | null;
    sender_id: string | null;
    content: string | null;
    status: Generated<message_status | null>;
    created_at: Generated<Timestamp | null>;
};
export type mfa_amr_claims = {
    session_id: string;
    created_at: Timestamp;
    updated_at: Timestamp;
    authentication_method: string;
    id: string;
};
export type mfa_challenges = {
    id: string;
    factor_id: string;
    created_at: Timestamp;
    verified_at: Timestamp | null;
    ip_address: string;
    otp_code: string | null;
    web_authn_session_data: unknown | null;
};
export type mfa_factors = {
    id: string;
    user_id: string;
    friendly_name: string | null;
    factor_type: factor_type;
    status: factor_status;
    created_at: Timestamp;
    updated_at: Timestamp;
    secret: string | null;
    phone: string | null;
    last_challenged_at: Timestamp | null;
    web_authn_credential: unknown | null;
    web_authn_aaguid: string | null;
    last_webauthn_challenge_data: unknown | null;
};
export type notifications = {
    notification_id: Generated<string>;
    recipient_user_id: string;
    actor_user_id: string | null;
    institution_id: string | null;
    title: string;
    message: string;
    status: Generated<notification_status | null>;
    action_type: notification_action_type;
    resource_type: notification_resource_type;
    resource_id: string | null;
    resource_label: string | null;
    metadata: unknown | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    read_at: Timestamp | null;
};
export type oauth_authorizations = {
    id: string;
    authorization_id: string;
    client_id: string;
    user_id: string | null;
    redirect_uri: string;
    scope: string;
    state: string | null;
    resource: string | null;
    code_challenge: string | null;
    code_challenge_method: code_challenge_method | null;
    response_type: Generated<oauth_response_type>;
    status: Generated<oauth_authorization_status>;
    authorization_code: string | null;
    created_at: Generated<Timestamp>;
    expires_at: Generated<Timestamp>;
    approved_at: Timestamp | null;
    nonce: string | null;
};
export type oauth_client_states = {
    id: string;
    provider_type: string;
    code_verifier: string | null;
    created_at: Timestamp;
};
export type oauth_clients = {
    id: string;
    client_secret_hash: string | null;
    registration_type: oauth_registration_type;
    redirect_uris: string;
    grant_types: string;
    client_name: string | null;
    client_uri: string | null;
    logo_uri: string | null;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
    deleted_at: Timestamp | null;
    client_type: Generated<oauth_client_type>;
    token_endpoint_auth_method: string;
};
export type oauth_consents = {
    id: string;
    user_id: string;
    client_id: string;
    scopes: string;
    granted_at: Generated<Timestamp>;
    revoked_at: Timestamp | null;
};
export type one_time_tokens = {
    id: string;
    user_id: string;
    token_type: one_time_token_type;
    token_hash: string;
    relates_to: string;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
};
export type pdf_templates = {
    template_id: Generated<string>;
    institution_id: string | null;
    document_kind: string;
    version: Generated<number>;
    status: string;
    header_config: unknown;
    footer_config: unknown;
    created_by: string | null;
    updated_by: string | null;
    published_by: string | null;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
    published_at: Timestamp | null;
};
export type proctor_assignments = {
    assignment_id: Generated<string>;
    exam_id: string | null;
    instructor_id: string | null;
    scheduled_at: Timestamp | null;
    status: Generated<proctor_assignment_status | null>;
    assigned_students_count: Generated<number | null>;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type question_bank_collection_questions = {
    collection_id: string;
    question_bank_question_id: string;
    order_index: Generated<number>;
    added_at: Generated<Timestamp | null>;
};
export type question_bank_collection_shares = {
    collection_id: string;
    user_id: string;
    created_at: Generated<Timestamp | null>;
};
export type question_bank_collections = {
    collection_id: Generated<string>;
    institution_id: string | null;
    created_by: string | null;
    updated_by: string | null;
    name: string;
    description: string | null;
    tags: Generated<string[]>;
    is_public: Generated<boolean>;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type question_bank_questions = {
    question_bank_question_id: Generated<string>;
    subject_id: string | null;
    institution_id: string | null;
    created_by: string | null;
    updated_by: string | null;
    question_type: question_type;
    content: unknown;
    passage_content: string | null;
    passage_type: Generated<string | null>;
    points: Generated<number>;
    tags: Generated<string[]>;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    archived_at: Timestamp | null;
    difficulty: Generated<question_difficulty>;
    source_origin: Generated<string>;
    source_file_name: string | null;
    source_page_number: number | null;
    source_evidence: string | null;
    actual_difficulty: question_difficulty | null;
    cognitive_level: string | null;
    last_used_at: Timestamp | null;
    predicted_difficulty: question_difficulty | null;
    status: Generated<question_bank_status>;
    topic: string | null;
    usage_count: Generated<number>;
};
export type rbac_permissions = {
    permission_id: Generated<string>;
    permission_key: string;
    module_key: string;
    action_key: string;
    category: string | null;
    scope: string | null;
    name: string;
    description: string | null;
    is_system: Generated<boolean | null>;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type rbac_role_permissions = {
    role_id: number;
    permission_id: string;
    created_at: Generated<Timestamp | null>;
};
export type rbac_user_permission_overrides = {
    user_id: string;
    permission_id: string;
    effect: string;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type refresh_tokens = {
    instance_id: string | null;
    id: Generated<string>;
    token: string | null;
    user_id: string | null;
    revoked: boolean | null;
    created_at: Timestamp | null;
    updated_at: Timestamp | null;
    parent: string | null;
    session_id: string | null;
};
export type roles = {
    role_id: Generated<number>;
    role_name: string;
    slug: string | null;
    description: string | null;
    is_system: Generated<boolean | null>;
    domain_scope: Generated<string[]>;
    is_active: Generated<boolean>;
    assignable_by: Generated<string[]>;
    permission_sync_mode: Generated<string>;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type rooms = {
    room_id: Generated<string>;
    room_name: string;
    room_code: string | null;
    institution_id: string | null;
    created_at: Generated<Timestamp | null>;
    created_by: string | null;
    updated_at: Generated<Timestamp | null>;
    updated_by: string | null;
    room_type: Generated<room_type>;
    status: Generated<room_status>;
    source_record_id: string | null;
    inheritance_status: Generated<inheritance_status | null>;
    overridden_at: Timestamp | null;
    overridden_by: string | null;
    hidden_at: Timestamp | null;
    hidden_by: string | null;
    room_number: string;
};
export type saml_providers = {
    id: string;
    sso_provider_id: string;
    entity_id: string;
    metadata_xml: string;
    metadata_url: string | null;
    attribute_mapping: unknown | null;
    created_at: Timestamp | null;
    updated_at: Timestamp | null;
    name_id_format: string | null;
};
export type saml_relay_states = {
    id: string;
    sso_provider_id: string;
    request_id: string;
    for_email: string | null;
    redirect_to: string | null;
    created_at: Timestamp | null;
    updated_at: Timestamp | null;
    flow_state_id: string | null;
};
export type schema_migrations = {
    version: string;
};
export type sections = {
    section_id: Generated<string>;
    section_name: string;
    year_level: number | null;
    department_id: string | null;
    created_at: Generated<Timestamp | null>;
    course_id: string | null;
    updated_at: Timestamp | null;
    created_by: string | null;
    updated_by: string | null;
    institution_id: string | null;
    source_record_id: string | null;
    inheritance_status: Generated<inheritance_status | null>;
    overridden_at: Timestamp | null;
    overridden_by: string | null;
    hidden_at: Timestamp | null;
    hidden_by: string | null;
};
export type sessions = {
    id: string;
    user_id: string;
    created_at: Timestamp | null;
    updated_at: Timestamp | null;
    factor_id: string | null;
    aal: aal_level | null;
    not_after: Timestamp | null;
    refreshed_at: Timestamp | null;
    user_agent: string | null;
    ip: string | null;
    tag: string | null;
    oauth_client_id: string | null;
    refresh_token_hmac_key: string | null;
    refresh_token_counter: string | null;
    scopes: string | null;
};
export type sso_domains = {
    id: string;
    sso_provider_id: string;
    domain: string;
    created_at: Timestamp | null;
    updated_at: Timestamp | null;
};
export type sso_providers = {
    id: string;
    resource_id: string | null;
    created_at: Timestamp | null;
    updated_at: Timestamp | null;
    disabled: boolean | null;
};
export type student_whitelist = {
    whitelist_id: Generated<string>;
    institution_id: string;
    department_id: string;
    course_id: string;
    student_number: string;
    last_name: string;
    first_name: string | null;
    status: Generated<student_whitelist_status | null>;
    claimed_user_id: string | null;
    claimed_at: Timestamp | null;
    created_by: string | null;
    updated_by: string | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type students = {
    student_id: Generated<string>;
    user_id: string | null;
    student_number: string;
    department_id: string | null;
    institution_id: string | null;
    course_id: string | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
};
export type subject_classification_courses = {
    subject_classification_id: string;
    course_id: string;
    created_at: Generated<Timestamp | null>;
};
export type subject_classification_subjects = {
    subject_classification_id: string;
    subject_id: string;
    created_at: Generated<Timestamp | null>;
};
export type subject_classifications = {
    subject_classification_id: Generated<string>;
    name: string;
    classification_type: Generated<string>;
    description: string | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    created_by: string | null;
    updated_by: string | null;
    institution_id: string | null;
    department_id: string | null;
    source_record_id: string | null;
    inheritance_status: Generated<inheritance_status | null>;
    overridden_at: Timestamp | null;
    overridden_by: string | null;
    hidden_at: Timestamp | null;
    hidden_by: string | null;
};
export type subject_departments = {
    subject_id: string;
    department_id: string;
    created_at: Generated<Timestamp | null>;
};
export type subject_offering_courses = {
    subject_offering_id: string;
    course_id: string;
    created_at: Generated<Timestamp | null>;
};
export type subject_offering_departments = {
    subject_offering_id: string;
    department_id: string;
    created_at: Generated<Timestamp | null>;
};
export type subject_offering_sections = {
    subject_offering_id: string;
    section_id: string;
    created_at: Generated<Timestamp | null>;
};
export type subject_offering_year_levels = {
    subject_offering_id: string;
    year_level: number;
    created_at: Generated<Timestamp | null>;
};
export type subject_offerings = {
    subject_offering_id: Generated<string>;
    subject_id: string;
    term_id: string;
    status: Generated<subject_offering_status | null>;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    created_by: string | null;
    updated_by: string | null;
    institution_id: string | null;
    source_record_id: string | null;
    inheritance_status: Generated<inheritance_status | null>;
    overridden_at: Timestamp | null;
    overridden_by: string | null;
    hidden_at: Timestamp | null;
    hidden_by: string | null;
};
export type subject_sections = {
    subject_id: string;
    section_id: string;
    created_at: Generated<Timestamp | null>;
};
export type subject_year_levels = {
    subject_id: string;
    year_level: number;
    created_at: Generated<Timestamp | null>;
};
export type subjects = {
    subject_id: Generated<string>;
    subject_code: string;
    subject_title: string;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    created_by: string | null;
    updated_by: string | null;
    institution_id: string | null;
    term_id: string | null;
    is_opened: Generated<boolean | null>;
    offering_start_date: Timestamp | null;
    offering_end_date: Timestamp | null;
    source_record_id: string | null;
    inheritance_status: Generated<inheritance_status | null>;
    overridden_at: Timestamp | null;
    overridden_by: string | null;
    hidden_at: Timestamp | null;
    hidden_by: string | null;
};
export type system_settings = {
    system_setting_id: Generated<string>;
    category: string;
    setting_key: string;
    setting_value: unknown;
    description: string | null;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    updated_by: string | null;
};
export type telemetry_incident_evidence = {
    evidence_id: Generated<string>;
    attempt_id: string;
    incident_id: string | null;
    institution_id: string;
    student_id: string;
    event_id: string;
    event_type: incident_type;
    captured_at: Timestamp;
    received_at: Generated<Timestamp>;
    storage_bucket: string | null;
    storage_path: string | null;
    mime_type: string;
    declared_size_bytes: number;
    size_bytes: number | null;
    sha256: string | null;
    state: Generated<telemetry_incident_evidence_state>;
    expires_at: Timestamp;
    reviewed_at: Timestamp | null;
    deleted_at: Timestamp | null;
    deleted_by: string | null;
    deletion_reason: telemetry_incident_evidence_deletion_reason | null;
    failure_code: string | null;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
};
export type terms = {
    term_id: Generated<string>;
    academic_year: string;
    semester: string;
    is_active: Generated<boolean | null>;
    created_at: Generated<Timestamp | null>;
    institution_id: string | null;
    start_date: Timestamp | null;
    end_date: Timestamp | null;
    updated_at: Timestamp | null;
    source_record_id: string | null;
    inheritance_status: Generated<inheritance_status | null>;
    overridden_at: Timestamp | null;
    overridden_by: string | null;
    hidden_at: Timestamp | null;
    hidden_by: string | null;
};
export type user_profiles = {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    status: Generated<user_status | null>;
    created_at: Generated<Timestamp | null>;
    updated_at: Timestamp | null;
    institution_id: string | null;
    last_seen_at: Timestamp | null;
    department_id: string | null;
    course_id: string | null;
};
export type user_roles = {
    user_id: string;
    role_id: number;
    assigned_at: Generated<Timestamp | null>;
};
export type users = {
    instance_id: string | null;
    id: string;
    aud: string | null;
    role: string | null;
    email: string | null;
    encrypted_password: string | null;
    email_confirmed_at: Timestamp | null;
    invited_at: Timestamp | null;
    confirmation_token: string | null;
    confirmation_sent_at: Timestamp | null;
    recovery_token: string | null;
    recovery_sent_at: Timestamp | null;
    email_change_token_new: string | null;
    email_change: string | null;
    email_change_sent_at: Timestamp | null;
    last_sign_in_at: Timestamp | null;
    raw_app_meta_data: unknown | null;
    raw_user_meta_data: unknown | null;
    is_super_admin: boolean | null;
    created_at: Timestamp | null;
    updated_at: Timestamp | null;
    phone: string | null;
    phone_confirmed_at: Timestamp | null;
    phone_change: Generated<string | null>;
    phone_change_token: Generated<string | null>;
    phone_change_sent_at: Timestamp | null;
    confirmed_at: Generated<Timestamp | null>;
    email_change_token_current: Generated<string | null>;
    email_change_confirm_status: Generated<number | null>;
    banned_until: Timestamp | null;
    reauthentication_token: Generated<string | null>;
    reauthentication_sent_at: Timestamp | null;
    is_sso_user: Generated<boolean>;
    deleted_at: Timestamp | null;
    is_anonymous: Generated<boolean>;
};
export type webauthn_challenges = {
    id: Generated<string>;
    user_id: string | null;
    challenge_type: string;
    session_data: unknown;
    created_at: Generated<Timestamp>;
    expires_at: Timestamp;
};
export type webauthn_credentials = {
    id: Generated<string>;
    user_id: string;
    credential_id: Buffer;
    public_key: Buffer;
    attestation_type: Generated<string>;
    aaguid: string | null;
    sign_count: Generated<string>;
    transports: Generated<unknown>;
    backup_eligible: Generated<boolean>;
    backed_up: Generated<boolean>;
    friendly_name: Generated<string>;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
    last_used_at: Timestamp | null;
};
export type DB = {
    analytics_reports: analytics_reports;
    announcements: announcements;
    audit_logs: audit_logs;
    'auth.audit_log_entries': audit_log_entries;
    'auth.custom_oauth_providers': custom_oauth_providers;
    'auth.flow_state': flow_state;
    'auth.identities': identities;
    'auth.instances': instances;
    'auth.mfa_amr_claims': mfa_amr_claims;
    'auth.mfa_challenges': mfa_challenges;
    'auth.mfa_factors': mfa_factors;
    'auth.oauth_authorizations': oauth_authorizations;
    'auth.oauth_client_states': oauth_client_states;
    'auth.oauth_clients': oauth_clients;
    'auth.oauth_consents': oauth_consents;
    'auth.one_time_tokens': one_time_tokens;
    'auth.refresh_tokens': refresh_tokens;
    'auth.saml_providers': saml_providers;
    'auth.saml_relay_states': saml_relay_states;
    'auth.schema_migrations': schema_migrations;
    'auth.sessions': sessions;
    'auth.sso_domains': sso_domains;
    'auth.sso_providers': sso_providers;
    'auth.users': users;
    'auth.webauthn_challenges': webauthn_challenges;
    'auth.webauthn_credentials': webauthn_credentials;
    calendar_events: calendar_events;
    class_groups: class_groups;
    class_roles: class_roles;
    classroom_instructor_assignments: classroom_instructor_assignments;
    conversation_participants: conversation_participants;
    conversations: conversations;
    course_subjects: course_subjects;
    courses: courses;
    departments: departments;
    enrollment_requests: enrollment_requests;
    enrollments: enrollments;
    exam_answer_key_exports: exam_answer_key_exports;
    exam_assigned_sections: exam_assigned_sections;
    exam_attempt_lifecycle_events: exam_attempt_lifecycle_events;
    exam_attempts: exam_attempts;
    exam_configurations: exam_configurations;
    exam_feedbacks: exam_feedbacks;
    exam_lobby_admissions: exam_lobby_admissions;
    exam_questions: exam_questions;
    exam_remediation_schedules: exam_remediation_schedules;
    exam_section_assignments: exam_section_assignments;
    exam_sections: exam_sections;
    exam_shares: exam_shares;
    exams: exams;
    flagged_incidents: flagged_incidents;
    institution_naming_conventions: institution_naming_conventions;
    institution_pdf_branding: institution_pdf_branding;
    institutions: institutions;
    instructor_courses: instructor_courses;
    instructor_subject_requests: instructor_subject_requests;
    instructor_subjects: instructor_subjects;
    instructors: instructors;
    live_inspection_leases: live_inspection_leases;
    livekit_webhook_events: livekit_webhook_events;
    messages: messages;
    notifications: notifications;
    pdf_templates: pdf_templates;
    proctor_assignments: proctor_assignments;
    question_bank_collection_questions: question_bank_collection_questions;
    question_bank_collection_shares: question_bank_collection_shares;
    question_bank_collections: question_bank_collections;
    question_bank_questions: question_bank_questions;
    rbac_permissions: rbac_permissions;
    rbac_role_permissions: rbac_role_permissions;
    rbac_user_permission_overrides: rbac_user_permission_overrides;
    roles: roles;
    rooms: rooms;
    sections: sections;
    student_whitelist: student_whitelist;
    students: students;
    subject_classification_courses: subject_classification_courses;
    subject_classification_subjects: subject_classification_subjects;
    subject_classifications: subject_classifications;
    subject_departments: subject_departments;
    subject_offering_courses: subject_offering_courses;
    subject_offering_departments: subject_offering_departments;
    subject_offering_sections: subject_offering_sections;
    subject_offering_year_levels: subject_offering_year_levels;
    subject_offerings: subject_offerings;
    subject_sections: subject_sections;
    subject_year_levels: subject_year_levels;
    subjects: subjects;
    system_settings: system_settings;
    telemetry_incident_evidence: telemetry_incident_evidence;
    terms: terms;
    user_profiles: user_profiles;
    user_roles: user_roles;
};
