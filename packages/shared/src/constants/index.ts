import { EXAM_STATUSES } from '../schema/exams/assessment-schema';
export { EXAM_STATUSES };

// Configuration Constants
export const DEFAULT_PAGINATION_LIMIT = 10;
export const DATE_FORMAT = 'MMM dd, yyyy';
export const TIME_FORMAT = 'hh:mm a';
export const DATETIME_FORMAT = 'MMM dd, yyyy hh:mm a';

// Validation Regex
export const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
export const PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Enum Collections (for iteration/validation)
export const USER_ROLES = [
    'superadmin',
    'admin',
    'proctor',
    'student',
    'instructor',
    'support',
] as const;

export const EXAM_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const ACTION_TYPES = ['info', 'warning', 'error', 'success'] as const;

// App Constants
export const APP_NAME = 'Sentinel Proctoring System';
export const SUPPORT_EMAIL = 'support@sentinelph.tech';

// Academic Constants
export const DEPARTMENTS = [
    'School of Engineering, Computing, and Architecture', // SECA
    'School of Business, Management, and Accountancy', // SBMA
    'School of Arts, Sciences, and Education', // SASE
] as const;

export const DEPARTMENTS_ABBR: Record<string, string> = {
    'School of Engineering, Computing, and Architecture': 'SECA',
    'School of Business, Management, and Accountancy': 'SBMA',
    'School of Arts, Sciences, and Education': 'SASE',
};

export const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'] as const;

export const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer'] as const;

// Backported specific exports
export { MOCK_ADMIN_EVENTS, CALENDAR_QUERY_KEYS } from './admin/calendar';
export { MOCK_FLAGGED_INCIDENTS } from './admin/dashboard';

export { incidentLabels as ConstantsAdminDashboard_INCIDENT_LABELS } from './admin/dashboard';
export { INCIDENT_LABELS } from './proctor';
export { DEPARTMENT_QUERY_KEYS } from './admin/departments';
export { COURSE_QUERY_KEYS } from './admin/courses';
export { ROOM_QUERY_KEYS } from './admin/rooms';
export { CLASSROOM_QUERY_KEYS } from './admin/classrooms';
export { MOCK_USERS as ConstantsAdmin_MOCK_ADMIN_USERS } from './admin';
export { USER_QUERY_KEYS } from './admin/users';
export { STUDENT_WHITELIST_QUERY_KEYS } from './admin/student-whitelist';
export { MOCK_SYSTEM_STATS } from './admin';
export { MOCK_RECENT_ACTIVITY } from './admin';
export { MOCK_EXAM_CONFIG } from './admin';
export { MOCK_PROCTOR_ASSIGNMENTS } from './admin';
export { MOCK_REPORTS } from './admin';
export { MOCK_AUDIT_LOGS } from './admin';
export { MOCK_ANNOUNCEMENTS } from './admin';
export { MOCK_EXAM_COMPLETION_DATA } from './admin';
export { MOCK_INCIDENT_TRENDS } from './admin';
export { MOCK_CONVERSATIONS, MOCK_MESSAGES, MESSAGES_QUERY_KEYS } from './admin/messages';
export { MOCK_SECTIONS_LOCAL, SECTION_QUERY_KEYS } from './admin/sections';
export { DEFAULT_SECTION_STORE_STATE } from './admin/sections';
export { DEFAULT_SUBJECT_STORE_STATE } from './admin/subjects';
export { SUBJECT_QUERY_KEYS } from './admin/subjects';
export { SUBJECT_CLASSIFICATION_QUERY_KEYS } from './admin/subjects';
export { SUBJECT_OFFERING_QUERY_KEYS } from './admin/subjects';
export { MOCK_SUBJECTS } from './admin/subjects';
export { MOCK_MASTER_SUBJECTS } from './admin/subjects';
export { NAV_ITEMS, CORE_NAV_ITEMS } from './common';
export { FOOTER_LINKS, CORE_FOOTER_LINKS } from './common';
export { SOCIAL_LINKS } from './common';
export type { SplashscreenProviderProps } from './common';
export { MOCK_EXAM } from './proctor/exams/[id]/monitoring';
export { MOCK_STUDENTS as MOCK_MONITORING_STUDENTS } from './proctor/exams/[id]/monitoring';
export { MOCK_STUDENTS as MOCK_PROCTOR_STUDENTS } from './proctor';
export { flagIcons } from './proctor/exams/[id]/monitoring';
export { flagLabels } from './proctor/exams/[id]/monitoring';
export { severityColors } from './proctor/exams/[id]/monitoring';
export { statusConfig } from './proctor/exams/[id]/monitoring';
export { MOCK_PROCTOR } from './proctor';
export { MOCK_PROCTOR_EXAMS } from './proctor';
export { PROCTOR_NAV_ITEMS } from './proctor';
export { MOCK_DASHBOARD_STATS } from './proctor';
export { MOCK_AVAILABLE_SUBJECTS } from './proctor';
export { MOCK_SECTIONS } from './proctor';
export { MOCK_ACTIVE_SESSIONS } from './proctor';
export { BOTTOM_NAV_ITEMS } from './protected/student';
export { HEADER_NAV_ITEMS } from './protected/student';
export type { CheatingReportProps } from './protected/student';
export { MOBILE_USER_AGENT_REGEX } from './student/exam/[id]/configuration';
export { MOCK_QUESTIONS } from './student/exam/[id]/monitoring';
export { LOW_TIME_THRESHOLD_SECONDS } from './student/exam/[id]/monitoring';
export { MOCK_STUDENT } from './student';
export { MOCK_EXAMS } from './student';
export { MOCK_EXAM_HISTORY } from './student';
export { STUDENT_NAVIGATION } from './student';
export { MOCK_NOTIFICATIONS } from './student/notifications';

// Proctor Exams
export * from './exams/exam-constants';

// Superadmin
export { INSTITUTION_QUERY_KEYS } from './superadmin/institutions';
export { SEMESTER_QUERY_KEYS } from './superadmin/semesters';
export {
    ACCESS_CONTROL_QUERY_KEYS,
    DEFAULT_EXAMINATION_GLOBAL_SETTINGS,
    SUPPORT_ASSIGNABLE_ROLE_NAMES,
} from './access-control';
export { AUDIO_QUERY_KEYS } from './audio';
export {
    DEFAULT_TELEMETRY_SETTINGS,
    TELEMETRY_MEDIAPIPE_SANDBOX_V1_EVENT_TYPES,
    TELEMETRY_MEDIAPIPE_SANDBOX_V1_INERT_FIELDS,
    TELEMETRY_MEDIAPIPE_SANDBOX_V1_PREREQUISITES,
    TELEMETRY_QUERY_KEYS,
} from './telemetry';
export * from './permissions';
export { ANALYTICS_QUERY_KEYS, ANALYTICS_MUTATION_KEYS } from './analytics';
export { LOGS_QUERY_KEYS } from './logs';
export { FEEDBACK_QUERY_KEYS } from './feedbacks';
export { MOCK_SUPPORT_KPI_CARDS, MOCK_PLATFORM_ACTIVITY } from '../mock-data';
export * from './auth';

