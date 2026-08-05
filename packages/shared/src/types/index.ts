import type {
    TelemetryIncidentDetails,
    TelemetryIncidentRecord,
    TelemetryIncidentSeverity,
    TelemetryIncidentStatus,
    TelemetryIncidentType,
    TelemetryMetadata,
    TelemetryPlatform,
    TelemetryRuleKey,
    TelemetrySource,
} from '../schema/telemetry/telemetry-schema';
import type { StudentExamStatus } from './exams/exam';

export * from './telemetry-settings';
export * from './audio-settings';
export * from './dashboard';

// Student
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

// Enums
export type UserRole =
    | 'admin'
    | 'proctor'
    | 'student'
    | 'instructor'
    | 'superadmin'
    | 'disciplinary_officer'
    | 'support';
export type UserStatus = 'active' | 'inactive' | 'offline' | 'suspended' | 'archived';
export type RoomType = 'LECTURE' | 'LABORATORY' | 'VIRTUAL';
export type RoomStatus = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE';
export type TrendDirection = 'up' | 'down' | 'neutral';
export type ActionType = 'info' | 'warning' | 'error' | 'success';
export type ExamDifficulty = 'easy' | 'medium' | 'hard';
export type CheatingType =
    'gaze' | 'audio' | 'tab_switch' | 'screenshot' | 'screen_record' | 'multiple';
export * from './exams/exam';

export interface PresenceState {
    user_id: string;
    email: string;
    online_at: string;
}

// Core Entities

export interface User {
    id: string;
    email: string;
    role: UserRole;
    firstName?: string | null;
    lastName?: string | null;
    name?: string; // Virtual or concatenated name
    avatarUrl?: string | null;
    status: UserStatus;
    department?: string;
    departmentCode?: string | null;
    departmentId?: string | null;
    department_id?: string | null; // API alias
    course?: string;
    courses?: string[];
    courseId?: string | null;
    course_id?: string | null; // API alias
    courseIds?: string[];
    studentNo?: string | null;
    institution?: string;
    institutionId?: string | null;
    institution_id?: string | null; // API alias
    employeeNo?: string | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
}

export type StudentWhitelistStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface StudentWhitelist {
    id: string;
    institutionId: string;
    institutionName?: string | null;
    departmentId: string;
    departmentName?: string | null;
    departmentCode?: string | null;
    courseId: string;
    courseTitle?: string | null;
    courseCode?: string | null;
    studentNumber: string;
    lastName: string;
    firstName?: string | null;
    status: StudentWhitelistStatus;
    claimedUserId?: string | null;
    claimedAt?: Date | string | null;
    claimedEmail?: string | null;
    claimedName?: string | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
}

export interface StudentWhitelistInput {
    institution_id?: string;
    department_id: string;
    course_id: string;
    student_number: string;
    last_name: string;
    first_name?: string | null;
    status?: StudentWhitelistStatus;
}

export interface StudentWhitelistBulkImportRowInput {
    row_number: number;
    student_number: string;
    last_name: string;
    first_name?: string | null;
    status?: StudentWhitelistStatus;
    source_course?: string | null;
}

export interface StudentWhitelistBulkImportInput {
    institution_id?: string;
    department_id: string;
    course_id: string;
    rows: StudentWhitelistBulkImportRowInput[];
}

export interface StudentWhitelistBulkImportFailure {
    rowNumber: number;
    studentNumber?: string | null;
    lastName?: string | null;
    sourceCourse?: string | null;
    error: string;
}

export interface StudentWhitelistBulkImportResult {
    totalRows: number;
    createdCount: number;
    failedCount: number;
    failures: StudentWhitelistBulkImportFailure[];
}

export interface StudentWhitelistPurgeInput {
    institution_id?: string;
    department_id?: string;
    course_id?: string;
    status?: StudentWhitelistStatus;
    include_claimed?: boolean;
}

export interface StudentWhitelistPurgeResult {
    deletedCount: number;
    skippedClaimedCount: number;
}

export interface AdminUser extends User {
    role: 'admin';
    studentNo?: string; // For students
}

// Student & Academic
export interface Student extends User {
    role: 'student';
    userId: string;
    firstName: string;
    lastName: string;
    studentNo: string;
    section: string;
    term: string;
    subject: string;
    yearLevel?: string;
    enrollmentIds?: string;
    departmentId?: string | null;
    institutionId?: string | null;
    createdBy?: Date | string | null;
    createdAt: Date | string | null;
}

export interface Instructor extends User {
    role: 'instructor';
    userId: string;
    firstName: string;
    lastName: string;
    employeeNo: string;
    departmentId?: string | null;
    institutionId?: string | null;
    createdBy?: Date | string | null;
    createdAt?: Date | string | null;
}

export interface Department {
    id: string;
    department_id?: string; // API alias
    name: string;
    department_name?: string; // API alias
    code?: string | null;
    department_code?: string | null; // API alias
    institution?: string | null;
    institutionId?: string | null;
    institution_id?: string | null; // API alias
    createdAt?: Date | string | null;
    createdBy?: Date | string | null;
    updatedAt?: Date | string | null;
    updatedBy?: Date | string | null;
    sourceRecordId?: string | null;
    inheritanceStatus?: string;
    originInstitutionId?: string | null;
    effectiveInstitutionId?: string | null;
    isLocal?: boolean;
    isInherited?: boolean;
    isOverridden?: boolean;
    isHidden?: boolean;
}

export interface Room {
    id: string;
    name: string;
    code?: string | null;
    room_number: string;
    room_type: RoomType;
    status?: RoomStatus;
    institution?: string | null;
    institutionId?: string | null;
    createdAt?: Date | string | null;
    createdBy?: Date | string | null;
    updatedAt?: Date | string | null;
    updatedBy?: Date | string | null;
    sourceRecordId?: string | null;
    inheritanceStatus?: string;
    originInstitutionId?: string | null;
    effectiveInstitutionId?: string | null;
    isLocal?: boolean;
    isInherited?: boolean;
    isOverridden?: boolean;
    isHidden?: boolean;
}

export interface InstitutionRoomNamingRule {
    label: string;
    prefix: string;
    virtualPrefix: string;
}

export interface InstitutionSectionNamingRule {
    courseId: string;
    format: string;
    preview: string;
}

export interface InstitutionNamingRules {
    room: InstitutionRoomNamingRule;
    sectionRulesByCourseId: Record<string, InstitutionSectionNamingRule>;
}

export interface InstitutionNamingConventions {
    id?: string;
    institutionId?: string;
    roomCodeFormat?: string | null;
    sectionCodeFormat?: string | null;
    namingRules: InstitutionNamingRules;
    sourceInstitutionId?: string;
    isInherited?: boolean;
}

export interface Institution {
    id: string;
    name: string;
    code?: string | null;
    parentInstitutionId?: string | null;
    institutionKind?: 'STANDALONE' | 'PARENT' | 'CHILD';
    namingConventions?: InstitutionNamingConventions | null;
    createdAt: Date | string;
    createdBy: string;
    updatedAt?: Date | string | null;
    updatedBy?: string | null;
}

export interface InstitutionInput {
    name: string;
    code?: string | null;
    parentInstitutionId?: string | null;
    institutionKind?: 'STANDALONE' | 'PARENT' | 'CHILD';
    namingConventions?: InstitutionNamingConventions | null;
}

export interface OnboardingFormValues {
    firstName: string;
    lastName: string;
    studentNumber: string;
    institutionId: string;
    departmentId: string;
    courseId: string;
}

export interface Subject {
    id: string;
    subjectOfferingId?: string;
    title: string;
    code: string;
    section?: string; // Deprecated
    sections?: string[] | { id: string; name: string }[];
    department?: string;
    department_code?: string | null;
    departments?: string[];
    course?: string;
    course_code?: string | null;
    courses?: string[];
    yearLevel?: string;
    yearLevels?: string[];
    departmentIds?: string[];
    courseIds?: string[];
    sectionIds?: string[];
    yearLevelsNumeric?: number[];
    requestIds?: string[];
    departmentSummary?: string | null;
    courseSummary?: string | null;
    yearLevelSummary?: string | null;
    sectionSummary?: string | null;
    scopeSummary?: string | null;
    createdAt: string | null;
    createdBy: string | null; // Name of instructor/creator
    updatedAt?: string | null;
    updatedBy?: string | null;
    instructorId?: string; // ID of the assigned instructor
    status?: string; // Enrollment status (e.g., PENDING, APPROVED, REJECTED)
    requested_at?: string | null;
    approved_at?: string | null;
    approved_by?: string | null;
    termId?: string | null;
    termAcademicYear?: string | null;
    termSemester?: string | null;
}

export * from './enrollment';
export * from './classroom';

// Exam Configuration

export interface ExamHistory {
    id: string;
    attemptId?: string | null;
    examId: string;
    examTitle: string;
    subject: string;
    sectionName?: string | null;
    availableAt?: string | null;
    dueAt?: string | null;
    completedAt?: string | null;
    score?: number | null;
    totalScore?: number | null;
    percentage?: number | null;
    status: StudentExamStatus;
    result?: 'passed' | 'failed' | null;
    timeSpent?: number | null; // in minutes
    cheated?: boolean;
    cheatingType?: CheatingType | null;
    incidentCount?: number;
    durationMinutes?: number;
    passingScore?: number;
    roomName?: string | null;
}

export * from './access-control';

export interface ExamConfig {
    lobbyAdmissionMode: 'AUTOMATIC' | 'INSTRUCTOR_GATED';
    maxReconnectAttempts: number;
    strictMode: boolean;
    screenLock: boolean;
    cameraRequired: boolean;
    micRequired: boolean;
    aiRules: {
        gaze_tracking: boolean;
        face_detection: boolean;
        audio_anomaly_detection: boolean;
        multiple_faces_detection: boolean;
    };
    webSecurity: {
        tab_switching_monitor: boolean;
        full_screen_required: boolean;
        clipboard_control: boolean;
        right_click_disable: boolean;
        print_screen_disable: boolean;
    };
    mobileSecurity: {
        app_pinning_required: boolean;
        prevent_backgrounding: boolean;
        notification_block: boolean;
        screenshot_block: boolean;
        root_jailbreak_detection: boolean;
    };
    autoSubmitTimeoutMinutes: number;
}

// Assignments
export interface InstructorAssignment {
    id: string;
    instructorId: string;
    instructorName: string;
    examId: string;
    examName: string;
    assignedStudents: number;
    notes: string;
    status: 'active' | 'completed' | 'scheduled';
}

export type ProctorInfo = {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    department: string;
    institution: string;
};

// Exam forms
export * as AdminExamConfigTypes from './admin/exams/configuration';
export * as ProctorExamConfigTypes from './proctor/exams/configuration';

// Analytics & Reports
export interface AnalyticsReport {
    id: string;
    title: string;
    type: 'completion' | 'incident' | 'performance';
    generatedAt: string;
    format: 'pdf' | 'csv' | 'xlsx';
    status: 'ready' | 'generating' | 'failed';
}

export interface AnalyticsKPICardData {
    id: string;
    label: string;
    value: string | number;
    change?: number;
    trend?: TrendDirection;
    description?: string;
}

export interface IncidentSeverityDistribution {
    severity: string;
    count: number;
    percentage: number;
    fill?: string;
}

export interface IncidentTypeDistribution {
    type: string;
    count: number;
    percentage: number;
}

export interface DepartmentIntegrityMetric {
    department: string;
    completed: number;
    dropped: number;
    flagged: number;
}

export interface SystemStat {
    label: string;
    value: string | number;
    change?: number; // percentage change
    trend?: TrendDirection;
    description?: string;
}

// System Logs
export interface AuditLog {
    id: string;
    actor: string; // User ID or Name
    action: string;
    resourceType: string;
    resourceId: string;
    details: string;
    timestamp: string;
}

export interface Activity {
    id: string;
    user: string;
    action: string;
    target: string;
    timestamp: string;
    type: ActionType;
}

// Announcements
export interface Announcement {
    id: string;
    title: string;
    content: string;
    targetAudience: ('all' | 'students' | 'proctors')[];
    status: 'published' | 'draft' | 'scheduled';
    publishedAt?: string;
    author: string;
}

// Dashboard & Incidents
export type FlaggedIncident = {
    id: string;
    studentName: string;
    examName: string;
    incidentType: TelemetryIncidentType;
    severity: Lowercase<TelemetryIncidentSeverity>;
    timestamp: string;
    status: Lowercase<Exclude<TelemetryIncidentStatus, 'CONFIRMED' | 'DISMISSED'>> | 'resolved';
    platform?: TelemetryPlatform | null;
    source?: TelemetrySource | null;
    ruleKey?: TelemetryRuleKey | null;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    reviewNotes?: string | null;
};

// Calendar
export * from './admin/calendar';

// Chat & Messages
export type ChatUserStatus = 'online' | 'offline' | 'busy';

export interface ChatUser {
    id: string;
    name: string;
    avatar?: string;
    avatarUrl?: string | null;
    status: ChatUserStatus;
    role: 'admin' | 'proctor' | 'student' | 'instructor';
    institution?: { id: string; name: string } | null;
}

export interface Message {
    id: string;
    senderId: string;
    content: string;
    timestamp: string;
    isRead: boolean;
}

export interface Conversation {
    id: string;
    participants: ChatUser[];
    lastMessage?: Message;
    unreadCount?: number;
}
export interface Term {
    id: string;
    academicYear: string; // e.g. "2023-2024"
    semester: string;
    isActive: boolean;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    institution?: string | null;
    institutionId?: string | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
    sourceRecordId?: string | null;
    inheritanceStatus?: string;
    originInstitutionId?: string | null;
    effectiveInstitutionId?: string | null;
    isLocal?: boolean;
    isInherited?: boolean;
    isOverridden?: boolean;
    isHidden?: boolean;
}

export type Semester = Term;

export interface SemesterInput {
    academic_year: string;
    semester: string;
    is_active: boolean;
    start_date?: string | Date | null | undefined;
    end_date?: string | Date | null | undefined;
    institution_id?: string | null;
}

export interface Section {
    id: string; // Maps to section_id
    name: string; // Maps to section_name
    departmentId: string | null; // Maps to department_id
    courseId: string | null; // Maps to course_id
    yearLevel?: number; // Maps to year_level (optional in DB, can be smallint)
    createdAt?: Date | string | null;
    createdBy?: string;
    updatedAt?: Date | string | null;
    updatedBy?: string;
    institutionId?: string | null;
    sourceRecordId?: string | null;
    inheritanceStatus?: string;
    originInstitutionId?: string | null;
    effectiveInstitutionId?: string | null;
    isLocal?: boolean;
    isInherited?: boolean;
    isOverridden?: boolean;
    isHidden?: boolean;
    institutionName?: string | null;
    courseTitle?: string | null;
    courseCode?: string | null;
    departmentName?: string | null;
}

export interface ClassGroup {
    id: string;
    subjectId: string;
    sectionId: string;
    termId: string;
    schedule?: string; // e.g. "MWF 10:00-11:30"
    room?: string;
    instructorId?: string;
    createdAt?: string;
}

export interface Course {
    id: string;
    course_id?: string; // API alias
    code: string; // e.g., "BSIT-MWA"
    title: string; // e.g., "Bachelor of Science in Information Technology - Mobile Web Applications"
    department?: string;
    departmentId?: string | null;
    department_id?: string | null; // API alias
    departmentName?: string | null;
    department_name?: string | null; // API alias
    departmentCode?: string | null;
    institutionId?: string | null;
    institution_id?: string | null; // API alias
    description?: string;
    createdAt: string | null;
    createdBy?: string;
    updatedAt?: string | null;
    updatedBy?: string;
    sourceRecordId?: string | null;
    inheritanceStatus?: string;
    originInstitutionId?: string | null;
    effectiveInstitutionId?: string | null;
    isLocal?: boolean;
    isInherited?: boolean;
    isOverridden?: boolean;
    isHidden?: boolean;
    institutionName?: string | null;
}

export interface CourseInput {
    code: string | null;
    title: string;
    departmentId: string | null;
    description: string | null;
    institution_id?: string | null;
}

export type SubjectClassificationType = 'GENERAL' | 'CORE';

export interface SubjectClassificationSummary {
    id: string;
    name: string;
    type: SubjectClassificationType;
}

export interface SubjectClassificationSubject {
    id: string;
    code: string;
    title: string;
}

export interface SubjectClassification extends SubjectClassificationSummary {
    description?: string | null;
    subjectCount: number;
    subjects: SubjectClassificationSubject[];
    department_id?: string | null;
    course_ids?: string[];
    year_levels?: number[];
    institution_id?: string | null;
    createdAt?: Date | string | null;
    createdBy?: string | null;
    updatedAt?: Date | string | null;
    updatedBy?: string | null;
    sourceRecordId?: string | null;
    inheritanceStatus?: string;
    originInstitutionId?: string | null;
    effectiveInstitutionId?: string | null;
    isLocal?: boolean;
    isInherited?: boolean;
    isOverridden?: boolean;
    isHidden?: boolean;
}

export interface MasterSubject {
    id?: string;
    subject_id?: string; // API alias
    code: string;
    subject_code?: string; // API alias
    title: string;
    subject_title?: string; // API alias
    termId?: string | null;
    isOpened?: boolean;
    offeringStartDate?: Date | string | null;
    offeringEndDate?: Date | string | null;
    department?: string;
    yearLevel?: string;
    sections?: string[];
    departmentIds?: string[];
    courseIds?: string[];
    sectionIds?: string[];
    yearLevels?: number[];
    createdAt?: Date | string | null;
    createdBy?: string | null;
    updatedAt?: Date | string | null;
    updatedBy?: string | null;
    classifications?: SubjectClassificationSummary[];
    sourceRecordId?: string | null;
    inheritanceStatus?: string;
    originInstitutionId?: string | null;
    effectiveInstitutionId?: string | null;
    isLocal?: boolean;
    isInherited?: boolean;
    isOverridden?: boolean;
    isHidden?: boolean;
    institutionName?: string | null;
}

export type SubjectOfferingStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';

export interface SubjectOfferingDepartment {
    id: string;
    code?: string | null;
    name: string;
}

export interface SubjectOfferingCourse {
    id: string;
    code?: string | null;
    title: string;
}

export interface SubjectOfferingSection {
    id: string;
    classGroupId?: string | null;
    sectionId?: string | null;
    name: string;
    departmentId?: string | null;
    courseId?: string | null;
    yearLevel?: number | null;
}

export interface SubjectOfferingInstructor {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
}

export interface SubjectOffering {
    id: string;
    subjectId: string;
    subjectCode: string;
    subjectTitle: string;
    termId: string;
    termAcademicYear: string;
    termSemester: string;
    termStartDate?: Date | string | null;
    termEndDate?: Date | string | null;
    status: SubjectOfferingStatus;
    departmentIds: string[];
    courseIds: string[];
    sectionIds: string[];
    yearLevels: number[];
    departments: SubjectOfferingDepartment[];
    courses: SubjectOfferingCourse[];
    sections: SubjectOfferingSection[];
    classifications?: SubjectClassificationSummary[];
    isMultiDepartment?: boolean;
    createdAt?: Date | string | null;
    createdBy?: string | null;
    updatedAt?: Date | string | null;
    updatedBy?: string | null;
    sourceRecordId?: string | null;
    inheritanceStatus?: string;
    originInstitutionId?: string | null;
    effectiveInstitutionId?: string | null;
    isLocal?: boolean;
    isInherited?: boolean;
    isOverridden?: boolean;
    isHidden?: boolean;
    institutionName?: string | null;
    instructors?: SubjectOfferingInstructor[];
}

export interface SkippedSubjectOffering {
    subjectId: string;
    subjectCode: string;
    subjectTitle: string;
    existingSubjectOfferingId: string;
    reason: 'already_offered';
}

export interface ClassificationSubjectOfferingResult {
    classificationId: string;
    classificationName: string;
    termId: string;
    createdCount: number;
    skippedCount: number;
    totalSubjectCount: number;
    duplicateStrategy: 'skip_existing' | 'fail_existing';
    created: SubjectOffering[];
    skipped: SkippedSubjectOffering[];
}

export interface ActiveSession {
    id: string;
    studentName: string;
    examName: string;
    proctorName: string;
    duration: string;
    status: 'live' | 'paused' | 'reviewing';
}

export type { TelemetryIncidentDetails, TelemetryIncidentRecord, TelemetryMetadata };

// Auth
export type { LoginFormData } from './auth';
export type { LoginFormErrors } from './auth';
export type { RegisterFormData } from './auth';
export type { RegisterFormErrors } from './auth';

// Admin
export type {
    ChartProps,
    AnalyticsReportsListProps,
    AnalyticsKPICardsProps,
    IncidentSeverityChartProps,
    IncidentByTypeChartProps,
    DepartmentIntegrityChartProps,
} from './admin/analytics';
export type { DepartmentStoreState } from './admin/departments';
export type { DepartmentInput } from './admin/departments';
export type { RoomStoreState, RoomInput } from './admin/rooms';
export type { FormValues } from './admin/exams/configuration';
export type { UseExamConfigFormProps } from './admin/exams/configuration';
export type { AdminUserRole } from './admin';
export type { AssignInstructorFormData } from './admin/proctor/assignment';
export type { AssignInstructorDialogProps } from './admin/proctor/assignment';
export type { SectionStatus } from './admin/sections';
export type { SectionStoreState } from './admin/sections';
export type { Section as AdminSection } from './admin/sections';
export type { SubjectStoreState } from './admin/subjects';
export type { UserManagementTableProps } from './admin/users';

// Proctoring
export type { InstructorAssignmentExam } from './proctor/assignment';
export type { DashboardStat } from './proctor/dashboard';
export type { DashboardStatsProps } from './proctor/dashboard';
export type { RecentExamsProps } from './proctor/dashboard';
export type { RecentStudentsProps } from './proctor/dashboard';
export type { FlagType } from './proctor/exams/[id]/monitoring';
export type { Flag } from './proctor/exams/[id]/monitoring';
export type { StudentSession } from './proctor/exams/[id]/monitoring';
export type { ExamData } from './proctor/exams/[id]/monitoring';
export type { MonitoringOverview } from './proctor/exams/[id]/monitoring';
export type { ExamReportStudentStatus } from './proctor/exams/[id]/report';
export type { ExamReportSubmissionType } from './proctor/exams/[id]/report';
export type { ExamReportIncidentOutcomeSummary } from './proctor/exams/[id]/report';
export type { ExamReportIncidentTypeBreakdown } from './proctor/exams/[id]/report';
export type { ExamReportIncidentSeverityBreakdown } from './proctor/exams/[id]/report';
export type { ExamReportActionItem } from './proctor/exams/[id]/report';
export type { ExamReportExam } from './proctor/exams/[id]/report';
export type { ExamReportStudentSummary } from './proctor/exams/[id]/report';
export type { ExamReportSummary } from './proctor/exams/[id]/report';
export type { ExamReportActionItems } from './proctor/exams/[id]/report';
export type { ExamReport } from './proctor/exams/[id]/report';
export type { MonitoringHeaderProps } from './proctor/exams/[id]/monitoring';
export type { MonitoringStatsProps } from './proctor/exams/[id]/monitoring';
export type { StudentListProps } from './proctor/exams/[id]/monitoring';
export type { StudentCardProps } from './proctor/exams/[id]/monitoring';
export type { MonitoringLifecycleAction } from './proctor/exams/[id]/monitoring';
export type { ExamsPageHeaderProps } from './proctor/exams';
export type { ExamsFilterBarProps } from './proctor/exams';
export type { ExamsGridProps } from './proctor/exams';
export type { ExamCardProps } from './proctor/exams';
export type { ExamEmptyStateProps } from './proctor/exams';
export type { ExamCreateDialogProps } from './proctor/exams';
export type { ExamCreateFormProps } from './proctor/exams';
export type { ExamAssignDialogProps } from './proctor/exams';
export type { ExamActionCellProps } from './proctor/exams';
export type { QuestionCardProps } from './proctor/exams';
export type { QuestionFormProps } from './proctor/exams';
export type { GradingStatus } from './proctor/grading';
export type { GradingExam } from './proctor/grading';
export type { GradingStudentList } from './proctor/grading';
export type { GradingStudentSection } from './proctor/grading';
export type { SubmissionStatus } from './proctor/grading';
export type { GradingStudent } from './proctor/grading';
export type {
    AppNotification,
    NotificationAction,
    NotificationActor,
    NotificationList,
    NotificationResourceSummary,
    NotificationStatus,
} from './notifications';
export type { ProctorExam } from './proctor';
export type { EnrollmentFileColumn } from './proctor';
export type { EnrollmentFileResult } from './proctor';
export type { NavigationItem } from './proctor';
export type { ParsedStudent } from './proctor/students';
export type { ParseResult } from './proctor/students';
export type { StudentsPageHeaderProps } from './proctor/students';
export type { StudentsSearchProps } from './proctor/students';
export type { StudentsTableProps } from './proctor/students';
export type { StudentsEmptyStateProps } from './proctor/students';

// Student
export type { ExamCardProps as StudentExamCardProps } from './student';
export type { SystemCheckStatus } from './student/exam/[id]/configuration';
export type { SystemCheckItemProps } from './student/exam/[id]/configuration';
export type { UseSystemCheckReturn } from './student/exam/[id]/configuration';
export type { Question } from './student/exam/[id]/monitoring';
export type { ExamMonitoringState } from './student/exam/[id]/monitoring';
export type { ExamTimerState } from './student/exam/[id]/monitoring';
export type { ExamMonitoringData } from './student/exam/[id]/monitoring';
export type { ExamHeaderProps as MonitoringExamHeaderProps } from './student/exam/[id]/monitoring';
export type { ExamHeaderProps as HistoryExamHeaderProps } from './student/history/details';
export type { IntegrityAlertProps } from './student/exam/[id]/monitoring';
export type { QuestionDisplayProps } from './student/exam/[id]/monitoring';
export type { QuestionNavigatorProps } from './student/exam/[id]/monitoring';
export type { NavigationFooterProps } from './student/exam/[id]/monitoring';
export type { MobileNavigationProps } from './student/exam/[id]/monitoring';
export type { ExamInfoProps } from './student/history/details';
export type { ExamDetailStatsProps } from './student/history/details';
export type { ExamHeroScoreProps } from './student/history/details';
export type { HistoryFilterStatus } from './student/history';
export type { HistoryHeaderProps } from './student/history';
export type { HistoryFiltersProps } from './student/history';
export type { HistoryListProps } from './student/history';
export type { HistoryCardProps } from './student/history';
export type { UseStudentHistoryReturn } from './student/history';
export type { StudentInfo } from './student';
export type { DashboardStats } from './student';
export type { ExamListProps } from './student';
export type { ExamPaginationProps } from './student';
export type { ExamSearchProps } from './student';
export type { ExamTabsProps } from './student';
export type { ExamSidebarProps } from './student';
export type { ExamNotFoundProps } from './student';
export type { ExamInfoBarProps } from './student';
export type { ExamDescriptionProps } from './student';
export type { ExamBannerProps } from './student';
export type { NotificationType } from './student/notifications';
export type { NotificationPriority } from './student/notifications';
export type { Notification } from './student/notifications';
export * from './proctor/students';

// Messages
export * from './messages';

export * from '../schema/pdf-documents';
export * from '../exams/essay-rubric';
export * from '../schema/exams/essay-rubric-schema';
